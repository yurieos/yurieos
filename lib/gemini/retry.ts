/**
 * Gemini API Retry Logic
 *
 * Provides exponential backoff retry logic for Gemini API calls.
 * Handles transient errors like network issues, rate limits, and server errors.
 *
 * @see https://ai.google.dev/gemini-api/docs/troubleshooting
 */

import { logger } from '@/lib/utils/logger'

import { GeminiError, GeminiRateLimitError, isRetryableError } from './errors'

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** Jitter factor (0-1) to randomize delays (default: 0.1) */
  jitterFactor?: number
  /** Whether to retry on rate limit errors (default: true) */
  retryOnRateLimit?: boolean
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.1,
  retryOnRateLimit: true
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // Exponential backoff: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * Math.random()

  return cappedDelay + jitter
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await withGeminiRetry(
 *   () => client.models.generateContent({ ... }),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * )
 * ```
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    jitterFactor,
    retryOnRateLimit
  } = { ...DEFAULT_CONFIG, ...config }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      const shouldRetry = isRetryableError(lastError)

      // Special handling for rate limit errors
      if (lastError instanceof GeminiRateLimitError && !retryOnRateLimit) {
        throw lastError
      }

      // Don't retry if not retryable or last attempt
      if (!shouldRetry || attempt === maxRetries) {
        throw lastError
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterFactor
      )

      // Log retry attempt
      logger.warn(
        'Gemini/Retry',
        `Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${Math.round(delay)}ms`,
        {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          delayMs: Math.round(delay)
        }
      )

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Execute a function with retry logic for streaming responses
 *
 * Note: This only retries the initial connection, not mid-stream failures.
 * For streaming, consider using reconnection logic at a higher level.
 *
 * @param fn - The async function that returns an async iterable
 * @param config - Retry configuration
 * @returns The async iterable result
 */
export async function withGeminiRetryStream<T>(
  fn: () => Promise<AsyncIterable<T>>,
  config?: RetryConfig
): Promise<AsyncIterable<T>> {
  return withGeminiRetry(fn, config)
}

/**
 * Create a retry wrapper with preset configuration
 *
 * @param config - Default retry configuration
 * @returns A function that wraps async functions with retry logic
 *
 * @example
 * ```ts
 * const retry = createRetryWrapper({ maxRetries: 5 })
 * const result = await retry(() => someApiCall())
 * ```
 */
export function createRetryWrapper(config: RetryConfig) {
  return <T>(fn: () => Promise<T>): Promise<T> => withGeminiRetry(fn, config)
}
