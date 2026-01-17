import { UIMessage } from 'ai'
import { z } from 'zod'

import {
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES
} from '@/lib/types'

/**
 * Schema for image parts in messages
 * @see https://ai.google.dev/gemini-api/docs/image-understanding
 */
const ImagePartSchema = z.object({
  type: z.literal('image'),
  mimeType: z.enum(SUPPORTED_IMAGE_TYPES),
  data: z.string() // base64 encoded
})

/**
 * Schema for video parts in messages
 * Supports inline data (base64), File API URI, and YouTube URLs
 * @see https://ai.google.dev/gemini-api/docs/video-understanding
 */
const VideoPartSchema = z.object({
  type: z.literal('video'),
  mimeType: z.enum(SUPPORTED_VIDEO_TYPES).optional(), // Optional for YouTube URLs
  data: z.string().optional(), // base64 for inline
  fileUri: z.string().optional() // For File API or YouTube
})

/**
 * Schema for document parts in messages
 * Supports inline data (base64) and File API URI
 * @see https://ai.google.dev/gemini-api/docs/document-processing
 */
const DocumentPartSchema = z.object({
  type: z.literal('document'),
  mimeType: z.enum(SUPPORTED_DOCUMENT_TYPES),
  data: z.string().optional(), // base64 for inline
  fileUri: z.string().optional() // For File API
})

/**
 * Schema for audio parts in messages
 * Supports inline data (base64) and File API URI
 * @see https://ai.google.dev/gemini-api/docs/audio
 */
const AudioPartSchema = z.object({
  type: z.literal('audio'),
  mimeType: z.enum(SUPPORTED_AUDIO_TYPES),
  data: z.string().optional(), // base64 for inline
  fileUri: z.string().optional() // For File API
})

/**
 * Schema for property definitions in function parameters
 * @see https://ai.google.dev/gemini-api/docs/function-calling#function_declarations
 */
const PropertySchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.enum(['string', 'integer', 'number', 'boolean', 'array', 'object']),
    description: z.string(),
    enum: z.array(z.string()).optional(),
    items: PropertySchema.optional(),
    properties: z.record(z.string(), PropertySchema).optional(),
    required: z.array(z.string()).optional()
  })
)

/**
 * Schema for function declarations
 * Per best practice: Use descriptive names without spaces or special characters
 * @see https://ai.google.dev/gemini-api/docs/function-calling#function_declarations
 */
const FunctionDeclarationSchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Function name must use underscores or camelCase, no spaces/periods/dashes'
    ),
  description: z.string().min(1, 'Function description is required'),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(
      z.string(),
      z.object({
        type: z.enum([
          'string',
          'integer',
          'number',
          'boolean',
          'array',
          'object'
        ]),
        description: z.string(),
        enum: z.array(z.string()).optional(),
        items: z.any().optional()
      })
    ),
    required: z.array(z.string())
  })
})

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
 * Supports text, images, videos, documents, audio, tool calls, and other AI SDK v6 part types
 */
const MessagePartSchema = z.union([
  // Text part with length limit
  z.object({
    type: z.literal('text'),
    text: z.string().max(MAX_TEXT_LENGTH, 'Text content too long')
  }),
  // Image part (for Gemini multimodal)
  ImagePartSchema,
  // Video part (for Gemini multimodal)
  VideoPartSchema,
  // Document part (for Gemini multimodal - PDF)
  DocumentPartSchema,
  // Audio part (for Gemini multimodal)
  AudioPartSchema,
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
  id: z.string().min(1).max(100),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z
    .array(MessagePartSchema)
    .max(MAX_PARTS_PER_MESSAGE, 'Too many parts per message')
    .optional(),
  // Allow metadata to be flexible since it contains annotations
  metadata: z.record(z.string(), z.unknown()).optional()
})

/**
 * Schema for chat request body
 * Includes function calling configuration
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */
const ChatRequestSchema = z.object({
  id: z.string().min(1, 'Chat ID is required').max(100),
  messages: z
    .array(UIMessageSchema)
    .min(1, 'At least one message is required')
    .max(MAX_MESSAGES_PER_REQUEST, 'Too many messages in request'),
  mode: z.literal('agentic').default('agentic'),
  // Function calling options
  functions: z.array(FunctionDeclarationSchema).max(20).optional(),
  functionCallingMode: z.enum(['AUTO', 'ANY', 'NONE', 'VALIDATED']).optional(),
  allowedFunctionNames: z.array(z.string().max(100)).max(20).optional()
})

/**
 * Function calling mode type
 * @see https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
 */
export type FunctionCallingModeType = 'AUTO' | 'ANY' | 'NONE' | 'VALIDATED'

/**
 * Property schema type for function parameters
 */
export interface PropertySchemaInput {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: PropertySchemaInput
  properties?: Record<string, PropertySchemaInput>
  required?: string[]
}

/**
 * Function declaration type for API
 * Compatible with lib/gemini/function-calling/types.ts FunctionDeclaration
 */
export interface FunctionDeclarationInput {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, PropertySchemaInput>
    required: string[]
  }
}

export interface ChatRequest {
  id: string
  messages: UIMessage[]
  mode: 'agentic'
  functions?: FunctionDeclarationInput[]
  functionCallingMode?: FunctionCallingModeType
  allowedFunctionNames?: string[]
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
