import { UIMessage } from 'ai'
import { z } from 'zod'

/**
 * Schema for message parts in UIMessage
 * Supports text, tool calls, and other AI SDK v6 part types
 */
const MessagePartSchema = z.union([
  // Text part
  z.object({
    type: z.literal('text'),
    text: z.string()
  }),
  // Tool invocation part (v6 format: tool-{name})
  z.object({
    type: z.string().regex(/^tool-/),
    toolCallId: z.string(),
    state: z.string().optional(),
    input: z.unknown().optional(),
    output: z.unknown().optional()
  }),
  // Reasoning part
  z.object({
    type: z.literal('reasoning'),
    text: z.string()
  }),
  // Fallback for other part types (step-start, source, etc.)
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
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(MessagePartSchema).optional(),
  // Allow metadata to be flexible since it contains annotations
  metadata: z.record(z.unknown()).optional()
})

/**
 * Schema for chat request body
 */
const ChatRequestSchema = z.object({
  id: z.string().min(1, 'Chat ID is required'),
  messages: z.array(UIMessageSchema).min(1, 'At least one message is required'),
  mode: z.enum(['standard', 'deep-research']).default('standard')
})

export interface ChatRequest {
  id: string
  messages: UIMessage[]
  mode: 'standard' | 'deep-research'
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
    const errors = result.error.errors.map(e => {
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
