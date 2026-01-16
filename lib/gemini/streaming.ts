/**
 * Gemini Streaming Adapter
 * Bridges Gemini agentic workflow with Vercel AI SDK format for frontend compatibility
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/url-context
 * @see https://ai.google.dev/gemini-api/docs/code-execution
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
import {
  AudioPart,
  DocumentPart,
  ImagePart,
  ThinkingConfig,
  VideoPart
} from '@/lib/types'
import { logger } from '@/lib/utils/logger'

import { process } from './agentic'
import { processInputSafely } from './core'
import {
  ContentPart,
  ConversationTurn,
  FunctionCallingMode,
  FunctionDeclaration,
  ResearchChunk,
  ResearchConfig
} from './types'

// ============================================
// Stream Configuration
// ============================================

export interface GeminiStreamConfig {
  messages: UIMessage[]
  chatId?: string
  userId?: string
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

      // Batched annotation writing for better performance
      // Instead of writing after every annotation, we batch them and write:
      // 1. Before sending text deltas (to ensure UI has context)
      // 2. On completion or error
      // 3. When explicitly flushed (for important updates like phases)
      let annotationsPending = false
      let lastAnnotationWrite = 0
      const MIN_ANNOTATION_INTERVAL_MS = 100 // Minimum time between annotation writes

      // Helper to write annotations (batched)
      const writeAnnotations = (force: boolean = false) => {
        const now = Date.now()
        // Skip if no pending annotations or we wrote too recently (unless forced)
        if (!annotationsPending) return
        if (!force && now - lastAnnotationWrite < MIN_ANNOTATION_INTERVAL_MS)
          return

        writer.write({
          type: 'message-metadata',
          messageMetadata: {
            annotations: [...allAnnotations]
          }
        })
        annotationsPending = false
        lastAnnotationWrite = now
      }

      // Helper to mark annotations as pending
      const markAnnotationsPending = () => {
        annotationsPending = true
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
          model, // Pass selected model (Flash vs Pro)
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
              // Update phase annotation - force write for important state changes
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
              markAnnotationsPending()
              writeAnnotations(true) // Force write for phase changes
              break

            case 'progress':
              // Progress messages (not used in standard mode)
              break

            case 'source':
              // Individual source discovered - batch these
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
                markAnnotationsPending()
                writeAnnotations() // Batched - writes if interval passed
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
                markAnnotationsPending()
                writeAnnotations() // Batched
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
                markAnnotationsPending()
                writeAnnotations() // Batched
              }
              break

            case 'content':
              // Stream text content
              if (chunk.content) {
                // Flush pending annotations before starting text
                // This ensures UI has context before content appears
                if (!hasStartedText) {
                  writeAnnotations(true) // Force flush before text
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
                markAnnotationsPending()
                writeAnnotations(true) // Force write - important for UX
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
                markAnnotationsPending()
                writeAnnotations(true) // Force - function calls are important
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
                markAnnotationsPending()
                writeAnnotations(true) // Force - function results are important
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
                markAnnotationsPending()
                writeAnnotations() // Batched
              }
              break

            case 'complete':
              // Agentic workflow complete
              allAnnotations.push({
                type: 'agentic-phase',
                data: {
                  phase: 'complete',
                  sourceCount,
                  startTime
                }
              })
              markAnnotationsPending()
              writeAnnotations(true) // Force - completion is important
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
            geminiParts: geminiParts.length > 0 ? geminiParts : undefined
          })
        }
      } catch (error) {
        logger.error('Gemini/Stream', error)
        writer.write({
          type: 'error',
          errorText:
            error instanceof Error ? error.message : 'An error occurred'
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
}) {
  const {
    chatId,
    userId,
    query,
    messageId,
    fullContent,
    originalMessages,
    annotations,
    geminiParts
  } = params

  const convertedMessages = convertMessagesForStorage(originalMessages)

  // Build metadata including annotations and geminiParts
  const metadata: Record<string, unknown> = {}
  if (annotations.length > 0) {
    metadata.annotations = annotations
  }
  if (geminiParts && geminiParts.length > 0) {
    metadata.geminiParts = geminiParts
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
