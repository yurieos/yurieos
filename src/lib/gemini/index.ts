/**
 * Gemini Module - Main Entry Point
 *
 * Simple text generation with streaming
 * @see https://ai.google.dev/gemini-api/docs/text-generation
 */

// Core (Client + Safety)
export type { SafetyResult } from './core'
export {
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  getGeminiClient,
  isGeminiAvailable,
  processInputSafely
} from './core'

// Streaming (Vercel AI SDK compatible)
export type { GeminiStreamConfig } from './streaming'
export { createGeminiStreamResponse } from './streaming'

// Error Types and Utilities
export {
  GeminiAuthError,
  GeminiError,
  GeminiModelError,
  GeminiNetworkError,
  GeminiQuotaError,
  GeminiRateLimitError,
  GeminiRecitationError,
  GeminiSafetyError,
  GeminiTimeoutError,
  GeminiTokenLimitError,
  GeminiValidationError,
  getUserFriendlyMessage,
  isRetryableError,
  parseGeminiError
} from './errors'

// Retry Logic
export type { RetryConfig } from './retry'
export {
  createRetryWrapper,
  withGeminiRetry,
  withGeminiRetryStream
} from './retry'
