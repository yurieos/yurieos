/**
 * Gemini Streaming Adapter
 * Bridges Gemini research with Vercel AI SDK format for frontend compatibility
 *
 * Supports both standard research (seconds) and Deep Research Agent (minutes)
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  UIMessage
} from 'ai'

import { saveChat } from '@/lib/actions/chat'
import { Chat } from '@/lib/types'
import { ResearchAnnotation } from '@/lib/types/sources'

import { research } from './research'
import { processInputSafely } from './safety'
import {
  ContentPart,
  ConversationTurn,
  DeepResearchInteractionMetadata,
  ResearchChunk,
  ResearchConfig,
  ThinkingConfig
} from './types'

// ============================================
// Stream Configuration
// ============================================

export interface GeminiStreamConfig {
  messages: UIMessage[]
  chatId?: string
  userId?: string
  mode?: 'standard' | 'deep-research'
  /** Selected model ID (e.g., 'gemini-3-flash-preview', 'gemini-3-pro-preview') */
  model?: string
  /**
   * Thinking configuration for the model
   * @see https://ai.google.dev/gemini-api/docs/thinking
   */
  thinkingConfig?: ThinkingConfig
}

// ============================================
// Main Stream Response Creator
// ============================================

/**
 * Creates a streaming response using Gemini research
 * Compatible with the frontend chat components (Vercel AI SDK format)
 */
export async function createGeminiStreamResponse(
  config: GeminiStreamConfig
): Promise<Response> {
  const {
    messages,
    mode = 'standard',
    chatId,
    userId,
    model,
    thinkingConfig
  } = config

  // Get the latest user message as the query
  const query = getQueryFromMessages(messages)

  // Safety check: guard and redact input
  const safetyResult = await processInputSafely(query)

  if (safetyResult.blocked) {
    return createBlockedResponse(safetyResult.violations)
  }

  // Use sanitized query
  const sanitizedQuery = safetyResult.sanitizedInput

  // Convert messages to conversation history
  const conversationHistory = convertToConversationHistory(messages)

  // Create the streaming response
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = `msg-${Date.now()}`
      const startTime = Date.now()
      let hasStartedText = false
      let sourceCount = 0
      const allAnnotations: ResearchAnnotation[] = []
      let fullContent = ''
      // Store model parts with thought signatures for multi-turn preservation
      // Per https://ai.google.dev/gemini-api/docs/thought-signatures
      let geminiParts: ContentPart[] = []
      // Track Deep Research interaction metadata for reconnection/follow-ups
      // Per https://ai.google.dev/gemini-api/docs/deep-research
      let interactionMetadata: DeepResearchInteractionMetadata = {}

      // Helper to write annotations
      const writeAnnotations = () => {
        writer.write({
          type: 'message-metadata',
          messageMetadata: {
            annotations: [...allAnnotations]
          }
        })
      }

      try {
        // Research configuration
        // Per https://ai.google.dev/gemini-api/docs/thinking
        const researchConfig: ResearchConfig = {
          mode,
          model, // Pass selected model for standard mode (Flash vs Pro)
          thinkingConfig, // Pass thinking configuration from model
          conversationHistory: conversationHistory.slice(0, -1) // Exclude current query
        }

        // Stream research results
        for await (const chunk of research(sanitizedQuery, researchConfig)) {
          switch (chunk.type) {
            case 'phase':
              // Update phase annotation
              if (mode === 'standard') {
                // Map research phases to quicksearch phases
                const quickSearchPhase =
                  chunk.phase === 'complete'
                    ? 'complete'
                    : chunk.phase === 'synthesizing'
                      ? 'answering'
                      : 'searching'

                allAnnotations.push({
                  type: 'quicksearch-phase',
                  data: {
                    phase: quickSearchPhase,
                    sourceCount,
                    startTime
                  }
                })
              } else {
                allAnnotations.push({
                  type: 'research-phase',
                  data: {
                    phase: chunk.phase || 'searching',
                    description: chunk.content
                  }
                })
              }
              writeAnnotations()
              break

            case 'progress':
              // Progress message only for deep research mode
              if (mode === 'deep-research') {
                // Capture interaction metadata for reconnection/follow-ups
                if (chunk.metadata?.interactionId) {
                  interactionMetadata.interactionId =
                    chunk.metadata.interactionId
                }
                if (chunk.metadata?.lastEventId) {
                  interactionMetadata.lastEventId = chunk.metadata.lastEventId
                }

                allAnnotations.push({
                  type: 'research-progress',
                  data: {
                    message: chunk.content || '',
                    phase: chunk.phase,
                    // Include interaction ID for UI tracking
                    interactionId: interactionMetadata.interactionId
                  }
                })
                writeAnnotations()
              }
              break

            case 'source':
              // Individual source discovered
              if (chunk.source) {
                allAnnotations.push({
                  type: 'research-source',
                  data: {
                    id: chunk.source.id,
                    title: chunk.source.title,
                    url: chunk.source.url,
                    domain: chunk.source.domain,
                    confidence: 0.8,
                    excerpt: ''
                  }
                })
                sourceCount++
                writeAnnotations()
              }
              break

            case 'sources':
              // Batch sources update
              if (chunk.sources) {
                for (const source of chunk.sources) {
                  // Check if source already added
                  const exists = allAnnotations.some(
                    a =>
                      a.type === 'research-source' &&
                      (a.data as any).url === source.url
                  )
                  if (!exists) {
                    allAnnotations.push({
                      type: 'research-source',
                      data: {
                        id: source.id,
                        title: source.title,
                        url: source.url,
                        domain: source.domain,
                        confidence: 0.8,
                        excerpt: ''
                      }
                    })
                    sourceCount++
                  }
                }
                writeAnnotations()
              }
              break

            case 'thought':
              // Emit thought step for ChainOfThought display
              // Per https://ai.google.dev/gemini-api/docs/thinking - thought summaries provide insights
              if (chunk.content) {
                const thoughtContent = chunk.content.trim()
                // Parse thought content into summary and details
                const lines = thoughtContent.split('\n').filter(l => l.trim())
                // Strip markdown formatting (**, *, _, etc.)
                const cleanText = (text: string) =>
                  text
                    .replace(/\*\*/g, '') // Remove **bold**
                    .replace(/\*/g, '') // Remove *italic*
                    .replace(/_/g, '') // Remove _underline_
                    .replace(/`/g, '') // Remove `code`
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
              break

            case 'content':
              // Stream text content
              if (chunk.content) {
                if (!hasStartedText) {
                  writer.write({
                    type: 'text-start',
                    id: messageId
                  })
                  hasStartedText = true
                }

                fullContent += chunk.content
                writer.write({
                  type: 'text-delta',
                  id: messageId,
                  delta: chunk.content
                })
              }
              break

            case 'followup':
              // Follow-up questions
              if (chunk.followUpQuestions) {
                allAnnotations.push({
                  type: 'related-questions',
                  data: {
                    items: chunk.followUpQuestions.map(q => ({ query: q }))
                  }
                })
                writeAnnotations()
              }
              break

            case 'model-parts':
              // Store model parts with thought signatures for multi-turn preservation
              // Per https://ai.google.dev/gemini-api/docs/thought-signatures
              if (chunk.modelParts) {
                geminiParts = chunk.modelParts
              }
              break

            case 'complete':
              // Capture final interaction metadata for Deep Research
              if (chunk.metadata?.interactionId) {
                interactionMetadata.interactionId = chunk.metadata.interactionId
              }
              if (chunk.metadata?.lastEventId) {
                interactionMetadata.lastEventId = chunk.metadata.lastEventId
              }

              // Research complete
              if (mode === 'standard') {
                allAnnotations.push({
                  type: 'quicksearch-phase',
                  data: {
                    phase: 'complete',
                    sourceCount,
                    startTime
                  }
                })
              } else {
                allAnnotations.push({
                  type: 'research-complete',
                  data: {
                    phase: 'complete',
                    success: true,
                    metadata: chunk.metadata,
                    // Include interaction ID for follow-up questions
                    interactionId: interactionMetadata.interactionId
                  }
                })
              }
              writeAnnotations()
              break

            case 'error':
              writer.write({
                type: 'error',
                errorText: chunk.error || 'An error occurred'
              })
              break
          }
        }

        // End text block if started
        if (hasStartedText) {
          writer.write({
            type: 'text-end',
            id: messageId
          })
        }

        // Save chat to history
        if (chatId && fullContent) {
          await saveChatWithAnnotations({
            chatId,
            userId: userId || 'anonymous',
            query: sanitizedQuery,
            messageId,
            fullContent,
            originalMessages: messages,
            annotations: allAnnotations,
            // Include Gemini parts with thought signatures for multi-turn preservation
            geminiParts: geminiParts.length > 0 ? geminiParts : undefined,
            // Include interaction metadata for Deep Research follow-ups
            interactionMetadata: interactionMetadata.interactionId
              ? interactionMetadata
              : undefined
          })
        }
      } catch (error) {
        console.error('[Gemini Stream] Error:', error)
        writer.write({
          type: 'error',
          errorText:
            error instanceof Error ? error.message : 'An error occurred'
        })
      }
    },
    onError: (error: unknown) => {
      console.error('[Gemini Stream] Stream error:', error)
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
          ? "I can't process that request. Let me know if you have a different question I can help with! 🙂"
          : "I noticed some sensitive information in your message. Could you rephrase without including personal details? I'm here to help! 💡"

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
 * Convert UIMessages to conversation history format
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * - Gemini 3 models return thought signatures for all types of parts
 * - We must pass all signatures back as received to maintain reasoning context
 * - Preserves full parts structure when available in metadata
 */
function convertToConversationHistory(
  messages: UIMessage[]
): ConversationTurn[] {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => {
      const role = (msg.role === 'assistant' ? 'model' : 'user') as
        | 'user'
        | 'model'

      // Check if metadata contains preserved parts with thought signatures
      // This allows maintaining reasoning context across multi-turn conversations
      const metadata = msg.metadata as
        | { geminiParts?: ContentPart[] }
        | undefined
      if (metadata?.geminiParts && metadata.geminiParts.length > 0) {
        return {
          role,
          parts: metadata.geminiParts
        }
      }

      // Fallback to extracting text content
      const content =
        msg.parts
          ?.filter(
            (p): p is { type: 'text'; text: string } => p.type === 'text'
          )
          .map(p => p.text)
          .join('') || ''

      return {
        role,
        content
      }
    })
    .filter(
      msg =>
        (msg.content && msg.content.length > 0) ||
        (msg.parts && msg.parts.length > 0)
    )
}

/**
 * Convert UIMessages to storable format for chat saving
 */
function convertMessagesForStorage(messages: UIMessage[]) {
  return messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content:
      msg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text)
        .join('') || '',
    ...(msg.metadata ? { metadata: msg.metadata } : {})
  }))
}

/**
 * Save chat to history with annotations
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * We preserve geminiParts in metadata to maintain thought signatures across turns
 *
 * Per https://ai.google.dev/gemini-api/docs/deep-research:
 * We preserve interactionMetadata for Deep Research follow-up questions
 */
async function saveChatWithAnnotations(params: {
  chatId: string
  userId: string
  query: string
  messageId: string
  fullContent: string
  originalMessages: UIMessage[]
  annotations: ResearchAnnotation[]
  geminiParts?: ContentPart[]
  interactionMetadata?: DeepResearchInteractionMetadata
}) {
  const {
    chatId,
    userId,
    query,
    messageId,
    fullContent,
    originalMessages,
    annotations,
    geminiParts,
    interactionMetadata
  } = params

  const convertedMessages = convertMessagesForStorage(originalMessages)

  // Build metadata including annotations, geminiParts, and interaction metadata
  const metadata: Record<string, unknown> = {}
  if (annotations.length > 0) {
    metadata.annotations = annotations
  }
  if (geminiParts && geminiParts.length > 0) {
    metadata.geminiParts = geminiParts
  }
  // Include Deep Research interaction metadata for follow-up questions
  if (interactionMetadata?.interactionId) {
    metadata.interactionMetadata = interactionMetadata
  }

  const assistantMessage = {
    id: messageId,
    role: 'assistant' as const,
    content: fullContent,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {})
  }

  const chat: Chat = {
    id: chatId,
    title: query.slice(0, 100),
    createdAt: new Date(),
    userId,
    path: `/search/${chatId}`,
    messages: [...convertedMessages, assistantMessage]
  }

  await saveChat(chat, userId)
}

/**
 * Extracts the research query from messages
 */
function getQueryFromMessages(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  if (!lastUserMessage) {
    return ''
  }

  if (lastUserMessage.parts) {
    for (const part of lastUserMessage.parts) {
      if (part.type === 'text' && 'text' in part) {
        return part.text
      }
    }
  }

  return ''
}
