import type { UIMessage } from 'ai'
import { z } from 'zod'

// ============================================
// Validation Constants
// ============================================

/** Maximum length for text parts in messages (approx 100k tokens at 4 chars/token) */
const MAX_TEXT_LENGTH = 400_000

/** Maximum number of messages per request */
const MAX_MESSAGES_PER_REQUEST = 100

/** Maximum number of parts per message */
const MAX_PARTS_PER_MESSAGE = 20

/**
 * Schema for message parts in UIMessage
 * Supports text parts only
 */
const MessagePartSchema = z.union([
  // Text part with length limit
  z.object({
    type: z.literal('text'),
    text: z.string().max(MAX_TEXT_LENGTH, 'Text content too long')
  }),
  // Fallback for other part types
  z
    .object({
      type: z.string()
    })
    .passthrough()
])

/**
 * Schema for UIMessage structure
 * Validates the essential fields while allowing metadata flexibility
 */
const UIMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z
    .array(MessagePartSchema)
    .max(MAX_PARTS_PER_MESSAGE, 'Too many parts per message')
    .optional(),
  // Allow metadata to be flexible
  metadata: z.record(z.string(), z.unknown()).optional()
})

/**
 * Schema for chat request body
 */
const ChatRequestSchema = z.object({
  id: z.string().min(1, 'Chat ID is required').max(100),
  messages: z
    .array(UIMessageSchema)
    .min(1, 'At least one message is required')
    .max(MAX_MESSAGES_PER_REQUEST, 'Too many messages in request')
})

export interface ChatRequest {
  id: string
  messages: UIMessage[]
}

/**
 * Validate chat request body
 * @param body - The request body to validate
 * @returns Validation result with typed data or error message
 */
export function validateChatRequest(
  body: unknown
): { success: true; data: ChatRequest } | { success: false; error: string } {
  const result = ChatRequestSchema.safeParse(body)

  if (!result.success) {
    // Provide user-friendly error messages
    const errors = result.error.issues.map(e => {
      const path = e.path.join('.')
      return path ? `${path}: ${e.message}` : e.message
    })
    return {
      success: false,
      error: errors.join('; ')
    }
  }

  return { success: true, data: result.data as ChatRequest }
}
