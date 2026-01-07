/**
 * Thinking configuration for Gemini 3 models
 * @see https://ai.google.dev/gemini-api/docs/gemini-3
 * @see https://ai.google.dev/gemini-api/docs/thinking
 */
export interface ThinkingConfig {
  /**
   * Thinking level for Gemini 3 models
   * Controls the maximum depth of reasoning before producing a response.
   *
   * Gemini 3 Pro and Flash:
   * - low: Minimizes latency and cost. Best for simple tasks, chat, or high-throughput
   * - high: (Default) Maximizes reasoning depth. Longer time to first token.
   *
   * Gemini 3 Flash only:
   * - minimal: Near-zero thinking for most queries. Fastest responses.
   * - medium: Balanced thinking for most tasks.
   */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'

  /**
   * Whether to include thought summaries in responses
   * Provides insights into the model's reasoning process
   */
  includeThoughts?: boolean
}

export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  toolCallModel?: string

  /**
   * Thinking configuration for models that support it
   * @see https://ai.google.dev/gemini-api/docs/thinking
   */
  thinkingConfig?: ThinkingConfig
}
