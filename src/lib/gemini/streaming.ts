/**
 * Gemini Streaming Adapter
 * Text streaming with thinking support and Vercel AI SDK compatibility
 *
 * @see https://ai.google.dev/gemini-api/docs/text-generation
 * @see https://ai.google.dev/gemini-api/docs/thinking
 */

import {
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse
} from 'ai'

import { saveChat } from '@/lib/actions/chat'
import type { Chat, ResearchAnnotation } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

import { GEMINI_3_FLASH, getGeminiClient, processInputSafely } from './core'
import { getUserFriendlyMessage, parseGeminiError } from './errors'
import { withGeminiRetry } from './retry'

// ============================================
// Stream Configuration
// ============================================

export interface GeminiStreamConfig {
  messages: UIMessage[]
  chatId?: string
  userId?: string
  /** Selected model ID (e.g., 'gemini-3-flash-preview', 'gemini-3-pro-preview') */
  model?: string
}

// ============================================
// Main Stream Response Creator
// ============================================

/**
 * Creates a streaming response using Gemini API
 * Compatible with the frontend chat components (Vercel AI SDK format)
 */
export async function createGeminiStreamResponse(
  config: GeminiStreamConfig
): Promise<Response> {
  const { messages, chatId, userId, model = GEMINI_3_FLASH } = config

  // Get the latest user message as the query
  const query = getQueryFromMessages(messages)

  // Safety check: guard and redact input
  const safetyResult = await processInputSafely(query)

  if (safetyResult.blocked) {
    return createBlockedResponse(safetyResult.violations)
  }

  // Use sanitized query
  const sanitizedQuery = safetyResult.sanitizedInput

  // Convert messages to Gemini format (text only)
  const contents = convertToGeminiFormat(messages)

  // Create the streaming response
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = `msg-${Date.now()}`
      const startTime = Date.now()
      let fullContent = ''
      let hasStartedText = false
      const allAnnotations: ResearchAnnotation[] = []

      // Helper to write annotations
      const writeAnnotations = () => {
        if (allAnnotations.length > 0) {
          writer.write({
            type: 'message-metadata',
            messageMetadata: {
              annotations: [...allAnnotations]
            }
          })
        }
      }

      try {
        const ai = getGeminiClient()

        // Stream from Gemini API with retry
        // Enable thinking for Gemini 3 models
        const response = await withGeminiRetry(() =>
          ai.models.generateContentStream({
            model,
            contents,
            config: {
              thinkingConfig: {
                includeThoughts: true
              }
            }
          })
        )

        for await (const chunk of response) {
          // Process each candidate's parts
          const candidate = chunk.candidates?.[0]
          if (!candidate?.content?.parts) continue

          for (const part of candidate.content.parts) {
            // Handle thinking parts
            // Per https://ai.google.dev/gemini-api/docs/thinking
            if (part.thought && part.text) {
              const thoughtContent = part.text.trim()
              if (thoughtContent) {
                // Parse thought content into summary and details
                const lines = thoughtContent.split('\n').filter(l => l.trim())
                // Strip markdown formatting
                const cleanText = (text: string) =>
                  text
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/_/g, '')
                    .replace(/`/g, '')
                    .trim()
                const summary = cleanText(
                  lines[0]?.slice(0, 100) || 'Analyzing...'
                )
                const details = lines
                  .slice(1, 4)
                  .map(l => cleanText(l))
                  .filter(Boolean)

                allAnnotations.push({
                  type: 'thought-step',
                  data: {
                    id: `thought-${Date.now()}`,
                    summary,
                    details: details.length > 0 ? details : undefined,
                    timestamp: Date.now()
                  }
                })
                writeAnnotations()
              }
            }
            // Handle regular text parts
            else if (part.text && !part.thought) {
              if (!hasStartedText) {
                writer.write({
                  type: 'text-start',
                  id: messageId
                })
                hasStartedText = true
              }

              fullContent += part.text
              writer.write({
                type: 'text-delta',
                id: messageId,
                delta: part.text
              })
            }
          }
        }

        // End text block if started
        if (hasStartedText) {
          writer.write({
            type: 'text-end',
            id: messageId
          })
        }

        // Mark as complete
        allAnnotations.push({
          type: 'agentic-phase',
          data: {
            phase: 'complete',
            sourceCount: 0,
            startTime
          }
        })
        writeAnnotations()

        // Save chat to history
        if (chatId && fullContent) {
          await saveChatToHistory({
            chatId,
            userId: userId || 'anonymous',
            query: sanitizedQuery,
            messageId,
            fullContent,
            originalMessages: messages,
            annotations: allAnnotations
          })
        }
      } catch (error) {
        logger.error('Gemini/Stream', error)
        const parsed = parseGeminiError(error)
        writer.write({
          type: 'error',
          errorText: getUserFriendlyMessage(parsed)
        })
      }
    },
    onError: (error: unknown) => {
      logger.error('Gemini/Stream', error)
      return error instanceof Error ? error.message : 'An error occurred'
    }
  })

  return createUIMessageStreamResponse({ stream })
}

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a blocked response when safety check fails
 */
function createBlockedResponse(violations: string[]): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = `msg-${Date.now()}`

      writer.write({
        type: 'text-start',
        id: messageId
      })

      const message =
        violations.includes('prompt_injection') ||
        violations.includes('jailbreak')
          ? "I can't process that request. Let me know if you have a different question I can help with!"
          : 'I noticed some sensitive information in your message. Could you rephrase without including personal details?'

      writer.write({
        type: 'text-delta',
        id: messageId,
        delta: message
      })

      writer.write({
        type: 'text-end',
        id: messageId
      })
    },
    onError: () => 'An error occurred'
  })

  return createUIMessageStreamResponse({ stream })
}

/**
 * Convert UIMessages to Gemini API format (text only)
 */
function convertToGeminiFormat(
  messages: UIMessage[]
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: extractTextFromMessage(msg) }]
    }))
    .filter(msg => msg.parts[0].text.length > 0)
}

/**
 * Extracts text content from a UIMessage
 */
function extractTextFromMessage(message: UIMessage): string {
  if (message.parts) {
    const textParts = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
    if (textParts.length > 0) {
      return textParts.join('\n')
    }
  }
  return ''
}

/**
 * Extracts the query text from the last user message
 */
function getQueryFromMessages(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (!lastUserMessage) {
    return ''
  }
  return extractTextFromMessage(lastUserMessage)
}

/**
 * Save chat to history with annotations
 */
async function saveChatToHistory(params: {
  chatId: string
  userId: string
  query: string
  messageId: string
  fullContent: string
  originalMessages: UIMessage[]
  annotations: ResearchAnnotation[]
}) {
  const {
    chatId,
    userId,
    query,
    messageId,
    fullContent,
    originalMessages,
    annotations
  } = params

  // Convert messages to storable format (text only)
  const convertedMessages = originalMessages.map(msg => {
    const text = extractTextFromMessage(msg)
    return {
      id: msg.id,
      role: msg.role,
      content: text
    }
  })

  // Build metadata with annotations
  const metadata: Record<string, unknown> = {}
  if (annotations.length > 0) {
    metadata.annotations = annotations
  }

  const assistantMessage = {
    id: messageId,
    role: 'assistant' as const,
    content: fullContent,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {})
  }

  const title = query.trim().slice(0, 100) || 'New chat'
  const chat: Chat = {
    id: chatId,
    title,
    createdAt: new Date(),
    userId,
    path: `/search/${chatId}`,
    messages: [...convertedMessages, assistantMessage]
  }

  await saveChat(chat, userId)
}
