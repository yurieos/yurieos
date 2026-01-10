/**
 * Gemini Streaming Adapter
 * Bridges Gemini agentic workflow with Vercel AI SDK format for frontend compatibility
 *
 * Supports both standard agentic mode (seconds) and Deep Research Agent (minutes)
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/url-context
 * @see https://ai.google.dev/gemini-api/docs/code-execution
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  JSONValue,
  UIMessage
} from 'ai'

import { saveChat } from '@/lib/actions/chat'
import { Chat } from '@/lib/types'
import { ResearchAnnotation } from '@/lib/types'

import { process } from './agentic'
import { processInputSafely } from './core'
import {
  AudioPart,
  ContentPart,
  ConversationTurn,
  DeepResearchInteractionMetadata,
  DocumentPart,
  FunctionCallingMode,
  FunctionDeclaration,
  ImagePart,
  ResearchChunk,
  ResearchConfig,
  ThinkingConfig,
  VideoPart
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
  /**
   * Custom function declarations for function calling
   * @see https://ai.google.dev/gemini-api/docs/function-calling
   */
  functions?: FunctionDeclaration[]
  /**
   * Function calling mode
   * @see https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
   */
  functionCallingMode?: FunctionCallingMode
  /**
   * Restrict which functions can be called
   */
  allowedFunctionNames?: string[]
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
    thinkingConfig,
    functions,
    functionCallingMode,
    allowedFunctionNames
  } = config

  // Get the latest user message as the query
  const query = getQueryFromMessages(messages)

  // Extract multimodal attachments from the last user message
  // @see https://ai.google.dev/gemini-api/docs/image-understanding
  // @see https://ai.google.dev/gemini-api/docs/video-understanding
  // @see https://ai.google.dev/gemini-api/docs/document-processing
  // @see https://ai.google.dev/gemini-api/docs/audio
  const images = getImagesFromMessages(messages)
  const videos = getVideosFromMessages(messages)
  const documents = getDocumentsFromMessages(messages)
  const audios = getAudiosFromMessages(messages)

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
        // Agentic workflow configuration
        // Per https://ai.google.dev/gemini-api/docs/thinking
        // Per https://ai.google.dev/gemini-api/docs/image-understanding
        // Per https://ai.google.dev/gemini-api/docs/video-understanding
        // Per https://ai.google.dev/gemini-api/docs/document-processing
        // Per https://ai.google.dev/gemini-api/docs/audio
        // Per https://ai.google.dev/gemini-api/docs/function-calling
        const researchConfig: ResearchConfig = {
          mode,
          model, // Pass selected model for standard mode (Flash vs Pro)
          thinkingConfig, // Pass thinking configuration from model
          conversationHistory: conversationHistory.slice(0, -1), // Exclude current query
          images: images.length > 0 ? images : undefined, // Include image attachments
          videos: videos.length > 0 ? videos : undefined, // Include video attachments
          documents: documents.length > 0 ? documents : undefined, // Include document attachments
          audios: audios.length > 0 ? audios : undefined, // Include audio attachments
          // Function calling configuration
          functions,
          functionCallingMode,
          allowedFunctionNames
        }

        // Stream results from agentic workflow
        for await (const chunk of process(sanitizedQuery, researchConfig)) {
          switch (chunk.type) {
            case 'phase':
              // Update phase annotation
              if (mode === 'standard') {
                // Map workflow phases to agentic phases
                const agenticPhase =
                  chunk.phase === 'complete'
                    ? 'complete'
                    : chunk.phase === 'synthesizing'
                      ? 'answering'
                      : 'searching'

                allAnnotations.push({
                  type: 'agentic-phase',
                  data: {
                    phase: agenticPhase,
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
                  // Check if source already added by matching URL
                  const exists = allAnnotations.some(
                    a =>
                      a.type === 'research-source' &&
                      'url' in a.data &&
                      a.data.url === source.url
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

            case 'function-call':
              // Emit function calls being made
              // Per https://ai.google.dev/gemini-api/docs/function-calling
              if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                allAnnotations.push({
                  type: 'function-call',
                  data: {
                    calls: chunk.functionCalls.map(c => ({
                      id: `fc-${Date.now()}-${c.name}`,
                      name: c.name,
                      args: c.args,
                      timestamp: Date.now()
                    }))
                  }
                })
                writeAnnotations()
              }
              break

            case 'function-result':
              // Emit function execution results
              // Per https://ai.google.dev/gemini-api/docs/function-calling
              if (chunk.functionResults && chunk.functionResults.length > 0) {
                allAnnotations.push({
                  type: 'function-result',
                  data: {
                    results: chunk.functionResults.map(r => ({
                      name: r.name,
                      response: r.response,
                      success: !('error' in r.response),
                      timestamp: Date.now()
                    }))
                  }
                })
                writeAnnotations()
              }
              break

            case 'url-context':
              // Emit URL context metadata for URLs retrieved by the model
              // Per https://ai.google.dev/gemini-api/docs/url-context#understanding_the_response
              if (chunk.urlContextMetadata?.urlMetadata) {
                allAnnotations.push({
                  type: 'url-context',
                  data: {
                    urls: chunk.urlContextMetadata.urlMetadata.map(u => ({
                      url: u.retrievedUrl,
                      status: u.urlRetrievalStatus,
                      success:
                        u.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS'
                    }))
                  }
                })
                writeAnnotations()
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

              // Agentic workflow complete
              if (mode === 'standard') {
                allAnnotations.push({
                  type: 'agentic-phase',
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
 * Storable content part types for chat saving
 * When attachmentId is present, data is stripped to avoid storing base64 in Redis
 * Attachments with attachmentId are stored in Supabase Storage
 */
interface StorableTextPart {
  type: 'text'
  text: string
}

interface StorableImagePart {
  type: 'image'
  mimeType: string
  /** Base64 data - only stored if no attachmentId (unauthenticated users) */
  data?: string
  /** Attachment ID for persistent storage (authenticated users) */
  attachmentId?: string
  /** Original filename */
  filename?: string
}

interface StorableVideoPart {
  type: 'video'
  mimeType?: string
  /** Base64 data - only stored if no attachmentId */
  data?: string
  fileUri?: string
  /** Attachment ID for persistent storage */
  attachmentId?: string
  /** Original filename */
  filename?: string
}

interface StorableDocumentPart {
  type: 'document'
  mimeType: string
  /** Base64 data - only stored if no attachmentId */
  data?: string
  fileUri?: string
  /** Attachment ID for persistent storage */
  attachmentId?: string
  filename?: string
}

interface StorableAudioPart {
  type: 'audio'
  mimeType: string
  /** Base64 data - only stored if no attachmentId */
  data?: string
  fileUri?: string
  /** Attachment ID for persistent storage */
  attachmentId?: string
  filename?: string
}

type StorableContentPart =
  | StorableTextPart
  | StorableImagePart
  | StorableVideoPart
  | StorableDocumentPart
  | StorableAudioPart

/**
 * Convert UIMessages to storable format for chat saving
 * When attachmentId is present, strips base64 data to save Redis storage
 * Attachments with attachmentId can be retrieved from Supabase Storage via signed URLs
 */
function convertMessagesForStorage(messages: UIMessage[]) {
  return messages.map(msg => {
    // Convert parts to storable format
    // If attachmentId is present, don't store the base64 data (it's in Supabase Storage)
    const content: StorableContentPart[] = []

    if (msg.parts) {
      for (const part of msg.parts) {
        const anyPart = part as Record<string, unknown>

        switch (anyPart.type) {
          case 'text':
            if (typeof anyPart.text === 'string' && anyPart.text) {
              content.push({ type: 'text', text: anyPart.text })
            }
            break

          case 'image':
            if (typeof anyPart.mimeType === 'string') {
              const hasAttachmentId = typeof anyPart.attachmentId === 'string'
              // Only require data if no attachmentId
              if (hasAttachmentId || typeof anyPart.data === 'string') {
                content.push({
                  type: 'image',
                  mimeType: anyPart.mimeType,
                  // Strip data if attachmentId is present (stored in Supabase)
                  ...(hasAttachmentId
                    ? { attachmentId: anyPart.attachmentId as string }
                    : { data: anyPart.data as string }),
                  ...(typeof anyPart.filename === 'string'
                    ? { filename: anyPart.filename }
                    : {})
                })
              }
            }
            break

          case 'video':
            if (anyPart.data || anyPart.fileUri || anyPart.attachmentId) {
              const hasAttachmentId = typeof anyPart.attachmentId === 'string'
              content.push({
                type: 'video',
                ...(typeof anyPart.mimeType === 'string'
                  ? { mimeType: anyPart.mimeType }
                  : {}),
                // Strip data if attachmentId is present
                ...(hasAttachmentId
                  ? { attachmentId: anyPart.attachmentId as string }
                  : typeof anyPart.data === 'string'
                    ? { data: anyPart.data }
                    : {}),
                ...(typeof anyPart.fileUri === 'string'
                  ? { fileUri: anyPart.fileUri }
                  : {}),
                ...(typeof anyPart.filename === 'string'
                  ? { filename: anyPart.filename }
                  : {})
              })
            }
            break

          case 'document':
            if (
              typeof anyPart.mimeType === 'string' &&
              (anyPart.data || anyPart.fileUri || anyPart.attachmentId)
            ) {
              const hasAttachmentId = typeof anyPart.attachmentId === 'string'
              content.push({
                type: 'document',
                mimeType: anyPart.mimeType,
                // Strip data if attachmentId is present
                ...(hasAttachmentId
                  ? { attachmentId: anyPart.attachmentId as string }
                  : typeof anyPart.data === 'string'
                    ? { data: anyPart.data }
                    : {}),
                ...(typeof anyPart.fileUri === 'string'
                  ? { fileUri: anyPart.fileUri }
                  : {}),
                ...(typeof anyPart.filename === 'string'
                  ? { filename: anyPart.filename }
                  : {})
              })
            }
            break

          case 'audio':
            if (
              typeof anyPart.mimeType === 'string' &&
              (anyPart.data || anyPart.fileUri || anyPart.attachmentId)
            ) {
              const hasAttachmentId = typeof anyPart.attachmentId === 'string'
              content.push({
                type: 'audio',
                mimeType: anyPart.mimeType,
                // Strip data if attachmentId is present
                ...(hasAttachmentId
                  ? { attachmentId: anyPart.attachmentId as string }
                  : typeof anyPart.data === 'string'
                    ? { data: anyPart.data }
                    : {}),
                ...(typeof anyPart.fileUri === 'string'
                  ? { fileUri: anyPart.fileUri }
                  : {}),
                ...(typeof anyPart.filename === 'string'
                  ? { filename: anyPart.filename }
                  : {})
              })
            }
            break

          // Skip tool parts and other non-media types for storage
          default:
            break
        }
      }
    }

    // Return with proper typing for ExtendedCoreMessage compatibility
    // Content is stored as JSONValue array when parts exist
    return {
      id: msg.id,
      role: msg.role,
      content:
        content.length > 0
          ? (JSON.parse(JSON.stringify(content)) as JSONValue)
          : '',
      ...(msg.metadata ? { metadata: msg.metadata } : {})
    }
  })
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
 * Extracts the research query (text) from messages
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

/**
 * Extracts image parts from the last user message
 * @see https://ai.google.dev/gemini-api/docs/image-understanding
 */
function getImagesFromMessages(messages: UIMessage[]): ImagePart[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  if (!lastUserMessage || !lastUserMessage.parts) {
    return []
  }

  const images: ImagePart[] = []
  for (const part of lastUserMessage.parts) {
    // Cast to any to check custom 'image' type that's not in AI SDK types
    const anyPart = part as Record<string, unknown>
    if (
      anyPart.type === 'image' &&
      typeof anyPart.mimeType === 'string' &&
      typeof anyPart.data === 'string'
    ) {
      images.push({
        type: 'image',
        mimeType: anyPart.mimeType as ImagePart['mimeType'],
        data: anyPart.data
      })
    }
  }

  return images
}

/**
 * Extracts video parts from the last user message
 * Supports inline videos (base64) and YouTube URLs (fileUri)
 * @see https://ai.google.dev/gemini-api/docs/video-understanding
 */
function getVideosFromMessages(messages: UIMessage[]): VideoPart[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  if (!lastUserMessage || !lastUserMessage.parts) {
    return []
  }

  const videos: VideoPart[] = []
  for (const part of lastUserMessage.parts) {
    // Cast to any to check custom 'video' type that's not in AI SDK types
    const anyPart = part as Record<string, unknown>
    if (anyPart.type === 'video') {
      const videoPart: VideoPart = { type: 'video' }

      // Check for inline data (base64 encoded video)
      if (typeof anyPart.data === 'string' && anyPart.data) {
        videoPart.data = anyPart.data
        if (typeof anyPart.mimeType === 'string') {
          videoPart.mimeType = anyPart.mimeType as VideoPart['mimeType']
        }
      }

      // Check for fileUri (YouTube URL or File API)
      if (typeof anyPart.fileUri === 'string' && anyPart.fileUri) {
        videoPart.fileUri = anyPart.fileUri
        if (typeof anyPart.mimeType === 'string') {
          videoPart.mimeType = anyPart.mimeType as VideoPart['mimeType']
        }
      }

      // Only add if we have valid video data
      if (videoPart.data || videoPart.fileUri) {
        videos.push(videoPart)
      }
    }
  }

  return videos
}

/**
 * Extracts document parts from the last user message
 * Supports inline documents (base64) and File API (fileUri)
 * @see https://ai.google.dev/gemini-api/docs/document-processing
 */
function getDocumentsFromMessages(messages: UIMessage[]): DocumentPart[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  if (!lastUserMessage || !lastUserMessage.parts) {
    return []
  }

  const documents: DocumentPart[] = []
  for (const part of lastUserMessage.parts) {
    // Cast to any to check custom 'document' type that's not in AI SDK types
    const anyPart = part as Record<string, unknown>
    if (anyPart.type === 'document') {
      const documentPart: DocumentPart = {
        type: 'document',
        mimeType: 'application/pdf' // Default, will be overwritten if provided
      }

      // Get mimeType if provided
      if (typeof anyPart.mimeType === 'string') {
        documentPart.mimeType = anyPart.mimeType as DocumentPart['mimeType']
      }

      // Check for inline data (base64 encoded document)
      if (typeof anyPart.data === 'string' && anyPart.data) {
        documentPart.data = anyPart.data
      }

      // Check for fileUri (File API)
      if (typeof anyPart.fileUri === 'string' && anyPart.fileUri) {
        documentPart.fileUri = anyPart.fileUri
      }

      // Only add if we have valid document data
      if (documentPart.data || documentPart.fileUri) {
        documents.push(documentPart)
      }
    }
  }

  return documents
}

/**
 * Extracts audio parts from the last user message
 * Supports inline audio (base64) and File API (fileUri)
 * @see https://ai.google.dev/gemini-api/docs/audio
 */
function getAudiosFromMessages(messages: UIMessage[]): AudioPart[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')

  if (!lastUserMessage || !lastUserMessage.parts) {
    return []
  }

  const audios: AudioPart[] = []
  for (const part of lastUserMessage.parts) {
    // Cast to any to check custom 'audio' type that's not in AI SDK types
    const anyPart = part as Record<string, unknown>
    if (anyPart.type === 'audio') {
      const audioPart: AudioPart = {
        type: 'audio',
        mimeType: 'audio/mp3' // Default, will be overwritten if provided
      }

      // Get mimeType if provided
      if (typeof anyPart.mimeType === 'string') {
        audioPart.mimeType = anyPart.mimeType as AudioPart['mimeType']
      }

      // Check for inline data (base64 encoded audio)
      if (typeof anyPart.data === 'string' && anyPart.data) {
        audioPart.data = anyPart.data
      }

      // Check for fileUri (File API)
      if (typeof anyPart.fileUri === 'string' && anyPart.fileUri) {
        audioPart.fileUri = anyPart.fileUri
      }

      // Only add if we have valid audio data
      if (audioPart.data || audioPart.fileUri) {
        audios.push(audioPart)
      }
    }
  }

  return audios
}
