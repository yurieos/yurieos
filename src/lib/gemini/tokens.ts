/**
 * Gemini Token Estimation Utilities
 *
 * Provides token counting and validation for Gemini API requests.
 * Uses approximate character-to-token ratios for estimation.
 *
 * Note: For exact token counts, use the Gemini API's countTokens method.
 * These utilities provide fast client-side estimates for validation.
 *
 * @see https://ai.google.dev/gemini-api/docs/tokens
 */

import type { UIMessage } from 'ai'

import { LIMITS } from './constants'

// ============================================
// Token Estimation Constants
// ============================================

/**
 * Approximate characters per token for English text
 * Gemini uses a similar tokenization to other LLMs (~4 chars per token)
 */
const CHARS_PER_TOKEN = 4

/**
 * Token overhead for images (approximate)
 * Images are processed differently, this is a conservative estimate
 */
const IMAGE_TOKEN_OVERHEAD = 258

/**
 * Token overhead per message for role/structure
 */
const MESSAGE_OVERHEAD_TOKENS = 4

// ============================================
// Token Estimation Functions
// ============================================

/**
 * Estimate token count for a text string
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * ```ts
 * const tokens = estimateTokenCount('Hello, world!')
 * console.log(tokens) // ~4
 * ```
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0
  // Simple character-based estimation
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Estimate token count for a message with potential attachments
 *
 * @param message - The UI message to estimate tokens for
 * @returns Estimated token count including attachments
 */
export function estimateMessageTokens(message: UIMessage): number {
  let tokens = MESSAGE_OVERHEAD_TOKENS

  // AI SDK v6 uses 'parts' array
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (!part || typeof part !== 'object') continue

      const typedPart = part as { type?: string; text?: string }

      // Text parts
      if (typedPart.type === 'text' && typeof typedPart.text === 'string') {
        tokens += estimateTokenCount(typedPart.text)
      }
      // Image parts
      else if (typedPart.type === 'image') {
        tokens += IMAGE_TOKEN_OVERHEAD
      }
      // Reasoning parts (thinking content)
      else if (
        typedPart.type === 'reasoning' &&
        typeof typedPart.text === 'string'
      ) {
        tokens += estimateTokenCount(typedPart.text)
      }
    }
  }

  // Also check experimental_attachments for images
  const attachments = (message as { experimental_attachments?: unknown[] })
    .experimental_attachments
  if (Array.isArray(attachments)) {
    for (const attachment of attachments) {
      if (typeof attachment === 'object' && attachment !== null) {
        const att = attachment as { contentType?: string }
        if (att.contentType?.startsWith('image/')) {
          tokens += IMAGE_TOKEN_OVERHEAD
        }
      }
    }
  }

  return tokens
}

/**
 * Estimate total token count for an array of messages
 *
 * @param messages - Array of UI messages
 * @returns Total estimated token count
 */
export function estimateTotalTokens(messages: UIMessage[]): number {
  return messages.reduce(
    (total, message) => total + estimateMessageTokens(message),
    0
  )
}

/**
 * Result of token limit validation
 */
export interface TokenLimitResult {
  /** Whether the messages are within the token limit */
  withinLimit: boolean
  /** Estimated token count */
  estimatedTokens: number
  /** Maximum allowed tokens */
  maxTokens: number
  /** How many tokens over the limit (0 if within limit) */
  overBy: number
  /** Recommendation if over limit */
  recommendation?: string
}

/**
 * Check if messages are within token limits for a specific model
 *
 * @param messages - Array of UI messages
 * @param modelId - The model ID to check against
 * @returns Token limit validation result
 *
 * @example
 * ```ts
 * const result = checkTokenLimits(messages, 'gemini-3-flash-preview')
 * if (!result.withinLimit) {
 *   console.warn(`Over limit by ${result.overBy} tokens`)
 * }
 * ```
 */
export function checkTokenLimits(
  messages: UIMessage[],
  modelId = 'gemini-3-flash-preview'
): TokenLimitResult {
  const estimatedTokens = estimateTotalTokens(messages)

  // Get model-specific limit
  const maxTokens = modelId.includes('pro')
    ? LIMITS.GEMINI_3_PRO_INPUT_TOKENS
    : LIMITS.GEMINI_3_FLASH_INPUT_TOKENS

  const withinLimit = estimatedTokens <= maxTokens
  const overBy = withinLimit ? 0 : estimatedTokens - maxTokens

  const result: TokenLimitResult = {
    withinLimit,
    estimatedTokens,
    maxTokens,
    overBy
  }

  if (!withinLimit) {
    result.recommendation = `Consider removing ${Math.ceil(overBy / 100)} messages or summarizing the conversation history.`
  }

  return result
}

/**
 * Truncate conversation history to fit within token limits
 *
 * Keeps the most recent messages while staying within the limit.
 * Always preserves the first message (often contains important context).
 *
 * @param messages - Array of UI messages
 * @param maxTokens - Maximum token limit
 * @param reserveTokens - Tokens to reserve for response (default: 4096)
 * @returns Truncated array of messages
 *
 * @example
 * ```ts
 * const truncated = truncateToTokenLimit(messages, 100000)
 * console.log(`Truncated from ${messages.length} to ${truncated.length} messages`)
 * ```
 */
export function truncateToTokenLimit(
  messages: UIMessage[],
  maxTokens: number,
  reserveTokens = 4096
): UIMessage[] {
  const effectiveLimit = maxTokens - reserveTokens

  // If already within limit, return as-is
  const currentTokens = estimateTotalTokens(messages)
  if (currentTokens <= effectiveLimit) {
    return messages
  }

  // Always keep first message (system context) and last message (current query)
  if (messages.length <= 2) {
    return messages
  }

  const firstMessage = messages[0]
  const lastMessage = messages[messages.length - 1]
  const middleMessages = messages.slice(1, -1)

  // Calculate tokens for preserved messages
  let usedTokens =
    estimateMessageTokens(firstMessage) + estimateMessageTokens(lastMessage)

  // Add middle messages from most recent, going backwards
  const includedMiddle: UIMessage[] = []
  for (let i = middleMessages.length - 1; i >= 0; i--) {
    const messageTokens = estimateMessageTokens(middleMessages[i])
    if (usedTokens + messageTokens <= effectiveLimit) {
      includedMiddle.unshift(middleMessages[i])
      usedTokens += messageTokens
    } else {
      break
    }
  }

  return [firstMessage, ...includedMiddle, lastMessage]
}

/**
 * Get a human-readable token count summary
 *
 * @param messages - Array of UI messages
 * @param modelId - The model ID for context
 * @returns Human-readable summary string
 *
 * @example
 * ```ts
 * console.log(getTokenSummary(messages))
 * // "~12,450 tokens (1.2% of 1M limit)"
 * ```
 */
export function getTokenSummary(
  messages: UIMessage[],
  modelId = 'gemini-3-flash-preview'
): string {
  const result = checkTokenLimits(messages, modelId)
  const percentage = (
    (result.estimatedTokens / result.maxTokens) *
    100
  ).toFixed(1)
  const formattedTokens = result.estimatedTokens.toLocaleString()
  const formattedLimit =
    result.maxTokens >= 1_000_000
      ? `${(result.maxTokens / 1_000_000).toFixed(0)}M`
      : result.maxTokens.toLocaleString()

  return `~${formattedTokens} tokens (${percentage}% of ${formattedLimit} limit)`
}
