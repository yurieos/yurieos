/**
 * Structured Logger
 *
 * Provides consistent logging across the application with:
 * - Contextual prefixes for easy filtering
 * - Development vs production behavior
 * - Type-safe error handling
 * - Metadata support for debugging
 *
 * Future: Can be extended to send logs to monitoring services (Sentry, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMeta {
  [key: string]: unknown
}

/**
 * Format a log message with context and optional metadata
 */
function formatMessage(
  level: LogLevel,
  context: string,
  message: string,
  meta?: LogMeta
): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`
}

/**
 * Extract error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

/**
 * Extract error stack from unknown error type
 */
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack
  }
  return undefined
}

/**
 * Structured logger instance
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/utils/logger'
 *
 * // Basic usage
 * logger.info('API', 'Request received')
 *
 * // With metadata
 * logger.info('Auth', 'User logged in', { userId: '123' })
 *
 * // Error logging
 * try {
 *   await someOperation()
 * } catch (error) {
 *   logger.error('Operation', error, { operationId: '456' })
 * }
 * ```
 */
export const logger = {
  /**
   * Log debug messages (only in development)
   */
  debug(context: string, message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', context, message, meta))
    }
  },

  /**
   * Log informational messages
   */
  info(context: string, message: string, meta?: LogMeta): void {
    console.info(formatMessage('info', context, message, meta))
  },

  /**
   * Log warning messages
   */
  warn(context: string, message: string, meta?: LogMeta): void {
    console.warn(formatMessage('warn', context, message, meta))
  },

  /**
   * Log error messages with optional error object
   */
  error(context: string, error: unknown, meta?: LogMeta): void {
    const errorMessage = getErrorMessage(error)
    const errorStack = getErrorStack(error)

    const fullMeta: LogMeta = {
      ...meta,
      errorMessage,
      ...(process.env.NODE_ENV === 'development' && errorStack
        ? { stack: errorStack }
        : {})
    }

    console.error(formatMessage('error', context, errorMessage, fullMeta))

    // Future: Send to monitoring service
    // if (process.env.NODE_ENV === 'production') {
    //   captureException(error, { context, meta })
    // }
  },

  /**
   * Create a child logger with a preset context
   *
   * @example
   * ```ts
   * const authLogger = logger.child('Auth')
   * authLogger.info('User logged in') // [Auth] User logged in
   * ```
   */
  child(context: string) {
    return {
      debug: (message: string, meta?: LogMeta) =>
        logger.debug(context, message, meta),
      info: (message: string, meta?: LogMeta) =>
        logger.info(context, message, meta),
      warn: (message: string, meta?: LogMeta) =>
        logger.warn(context, message, meta),
      error: (error: unknown, meta?: LogMeta) =>
        logger.error(context, error, meta)
    }
  }
}
