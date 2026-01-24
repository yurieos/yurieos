/**
 * Gemini API Error Types
 *
 * Typed error classes for Gemini API errors with actionable messages.
 * Used for better error handling and user feedback.
 *
 * @see https://ai.google.dev/gemini-api/docs/troubleshooting
 */

/**
 * Base class for all Gemini-related errors
 */
export class GeminiError extends Error {
  /** HTTP status code if applicable */
  statusCode?: number
  /** Whether this error is retryable */
  retryable = false
  /** Original error that caused this error */
  cause?: Error

  constructor(
    message: string,
    options?: { statusCode?: number; cause?: Error }
  ) {
    super(message)
    this.name = 'GeminiError'
    this.statusCode = options?.statusCode
    this.cause = options?.cause
  }
}

/**
 * Error thrown when content is blocked by safety filters
 * Not retryable - user needs to modify their request
 */
export class GeminiSafetyError extends GeminiError {
  /** The safety category that was triggered */
  category?: string
  /** The probability rating */
  probability?: string

  constructor(
    message = 'Content blocked by safety filters',
    options?: { category?: string; probability?: string; cause?: Error }
  ) {
    super(message, { cause: options?.cause })
    this.name = 'GeminiSafetyError'
    this.category = options?.category
    this.probability = options?.probability
    this.retryable = false
  }
}

/**
 * Error thrown when rate limits are exceeded
 * Retryable with exponential backoff
 */
export class GeminiRateLimitError extends GeminiError {
  /** Suggested retry delay in milliseconds */
  retryAfterMs?: number

  constructor(
    message = 'Rate limit exceeded. Please try again later.',
    options?: { retryAfterMs?: number; cause?: Error }
  ) {
    super(message, { statusCode: 429, cause: options?.cause })
    this.name = 'GeminiRateLimitError'
    this.retryAfterMs = options?.retryAfterMs
    this.retryable = true
  }
}

/**
 * Error thrown when quota is exceeded
 * Not retryable without increasing quota
 */
export class GeminiQuotaError extends GeminiError {
  constructor(
    message = 'API quota exceeded. Please check your usage limits.',
    options?: { cause?: Error }
  ) {
    super(message, { statusCode: 429, cause: options?.cause })
    this.name = 'GeminiQuotaError'
    this.retryable = false
  }
}

/**
 * Error thrown when the API key is invalid or missing
 * Not retryable without fixing configuration
 */
export class GeminiAuthError extends GeminiError {
  constructor(
    message = 'Invalid or missing API key',
    options?: { cause?: Error }
  ) {
    super(message, { statusCode: 401, cause: options?.cause })
    this.name = 'GeminiAuthError'
    this.retryable = false
  }
}

/**
 * Error thrown when the model is unavailable
 * May be retryable depending on the cause
 */
export class GeminiModelError extends GeminiError {
  /** The model that was requested */
  model?: string

  constructor(
    message = 'Model is unavailable',
    options?: { model?: string; retryable?: boolean; cause?: Error }
  ) {
    super(message, { statusCode: 503, cause: options?.cause })
    this.name = 'GeminiModelError'
    this.model = options?.model
    this.retryable = options?.retryable ?? true
  }
}

/**
 * Error thrown when request validation fails
 * Not retryable without fixing the request
 */
export class GeminiValidationError extends GeminiError {
  /** The field that failed validation */
  field?: string

  constructor(
    message = 'Invalid request parameters',
    options?: { field?: string; cause?: Error }
  ) {
    super(message, { statusCode: 400, cause: options?.cause })
    this.name = 'GeminiValidationError'
    this.field = options?.field
    this.retryable = false
  }
}

/**
 * Error thrown for network-related issues
 * Usually retryable
 */
export class GeminiNetworkError extends GeminiError {
  constructor(message = 'Network error occurred', options?: { cause?: Error }) {
    super(message, { cause: options?.cause })
    this.name = 'GeminiNetworkError'
    this.retryable = true
  }
}

/**
 * Error thrown when response generation times out
 * May be retryable
 */
export class GeminiTimeoutError extends GeminiError {
  /** Timeout duration in milliseconds */
  timeoutMs?: number

  constructor(
    message = 'Request timed out',
    options?: { timeoutMs?: number; cause?: Error }
  ) {
    super(message, { statusCode: 504, cause: options?.cause })
    this.name = 'GeminiTimeoutError'
    this.timeoutMs = options?.timeoutMs
    this.retryable = true
  }
}

/**
 * Error thrown when response is blocked due to recitation
 * Not retryable - content too similar to training data
 */
export class GeminiRecitationError extends GeminiError {
  constructor(
    message = 'Response blocked due to potential recitation of training data',
    options?: { cause?: Error }
  ) {
    super(message, { cause: options?.cause })
    this.name = 'GeminiRecitationError'
    this.retryable = false
  }
}

/**
 * Error thrown when content exceeds token limits
 * Not retryable without reducing content
 */
export class GeminiTokenLimitError extends GeminiError {
  /** Estimated token count */
  tokenCount?: number
  /** Maximum allowed tokens */
  maxTokens?: number

  constructor(
    message = 'Content exceeds token limits',
    options?: { tokenCount?: number; maxTokens?: number; cause?: Error }
  ) {
    super(message, { statusCode: 400, cause: options?.cause })
    this.name = 'GeminiTokenLimitError'
    this.tokenCount = options?.tokenCount
    this.maxTokens = options?.maxTokens
    this.retryable = false
  }
}

// ============================================
// Error Detection Utilities
// ============================================

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Check if it's a GeminiError with retryable flag
  if (error instanceof GeminiError) {
    return error.retryable
  }

  // Check for common transient error patterns in error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const retryablePatterns = [
      'network',
      'timeout',
      'econnreset',
      'econnrefused',
      'socket hang up',
      'socket closed',
      'etimedout',
      'enotfound',
      'service unavailable',
      '503',
      '500',
      '502',
      '504',
      'internal server error',
      'bad gateway',
      'gateway timeout'
    ]

    return retryablePatterns.some(pattern => message.includes(pattern))
  }

  return false
}

/**
 * Parse an error from Gemini API response and return appropriate typed error
 */
export function parseGeminiError(error: unknown): GeminiError {
  if (error instanceof GeminiError) {
    return error
  }

  const originalError =
    error instanceof Error ? error : new Error(String(error))
  const message = originalError.message.toLowerCase()

  // Check for specific error types
  if (message.includes('safety') || message.includes('blocked by safety')) {
    return new GeminiSafetyError(originalError.message, {
      cause: originalError
    })
  }

  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return new GeminiRateLimitError(originalError.message, {
      cause: originalError
    })
  }

  if (message.includes('quota')) {
    return new GeminiQuotaError(originalError.message, { cause: originalError })
  }

  if (
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('401')
  ) {
    return new GeminiAuthError(originalError.message, { cause: originalError })
  }

  if (message.includes('timeout') || message.includes('504')) {
    return new GeminiTimeoutError(originalError.message, {
      cause: originalError
    })
  }

  if (message.includes('recitation')) {
    return new GeminiRecitationError(originalError.message, {
      cause: originalError
    })
  }

  if (
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  ) {
    return new GeminiNetworkError(originalError.message, {
      cause: originalError
    })
  }

  if (message.includes('token') && message.includes('limit')) {
    return new GeminiTokenLimitError(originalError.message, {
      cause: originalError
    })
  }

  // Default to base GeminiError
  return new GeminiError(originalError.message, { cause: originalError })
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof GeminiSafetyError) {
    return "I can't process that request due to safety guidelines. Please try rephrasing your question."
  }

  if (error instanceof GeminiRateLimitError) {
    return 'The service is experiencing high demand. Please wait a moment and try again.'
  }

  if (error instanceof GeminiQuotaError) {
    return 'API usage limits have been reached. Please try again later.'
  }

  if (error instanceof GeminiAuthError) {
    return 'There was an authentication issue. Please check your API configuration.'
  }

  if (error instanceof GeminiTimeoutError) {
    return 'The request took too long to complete. Please try again.'
  }

  if (error instanceof GeminiRecitationError) {
    return 'Unable to generate a response for this query. Please try a different approach.'
  }

  if (error instanceof GeminiNetworkError) {
    return 'A network error occurred. Please check your connection and try again.'
  }

  if (error instanceof GeminiTokenLimitError) {
    return 'The content is too long. Please try with a shorter message.'
  }

  if (error instanceof GeminiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}
