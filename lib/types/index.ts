/**
 * Shared Types
 * Consolidated type definitions for the application
 */

import { JSONValue, ModelMessage } from 'ai'

// ============================================
// Chat Types
// ============================================

export type SearchResults = {
  images: SearchResultImage[]
  results: SearchResultItem[]
  number_of_results?: number
  query: string
}

// If enabled the include_images_description is true, the images will be an array of { url: string, description: string }
// Otherwise, the images will be an array of strings
export type SearchResultImage =
  | string
  | {
      url: string
      description: string
      number_of_results?: number
    }

export type SearchResultItem = {
  title: string
  url: string
  content: string
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: ExtendedCoreMessage[] // Note: Changed from AIMessage to ExtendedCoreMessage
}

// ExtendedCoreMessage for saving annotations
export type ExtendedCoreMessage = Omit<ModelMessage, 'role' | 'content'> & {
  role: ModelMessage['role'] | 'data'
  content: ModelMessage['content'] | JSONValue
}

// ============================================
// Model Types
// @see https://ai.google.dev/gemini-api/docs/gemini-3
// @see https://ai.google.dev/gemini-api/docs/thinking
// ============================================

/**
 * Thinking configuration for Gemini 3 models
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

// ============================================
// Source Types
// ============================================

/**
 * Base source interface
 */
export interface BaseSource {
  url: string
  title: string
  domain: string
}

/**
 * UI Source - extends BaseSource with optional display fields
 */
export interface UISource extends BaseSource {
  id: string
  excerpt?: string
  confidence?: number
  favicon?: string
}

/**
 * Research phases
 */
export type ResearchPhase =
  | 'searching'
  | 'understanding'
  | 'verifying'
  | 'synthesizing'
  | 'answering'
  | 'complete'

// ============================================
// Annotation Types - Used for streaming
// ============================================

interface AnnotationMetadata {
  iteration?: number
  sourceCount?: number
  factCount?: number
  confidence?: number
}

export interface ResearchPhaseAnnotation {
  type: 'research-phase'
  data: {
    phase: ResearchPhase
    description?: string
    metadata?: AnnotationMetadata
  }
}

export interface ResearchProgressAnnotation {
  type: 'research-progress'
  data: {
    message: string
    phase?: ResearchPhase
    metadata?: AnnotationMetadata
    interactionId?: string
  }
}

export interface ResearchSourceAnnotation {
  type: 'research-source'
  data: {
    id: string
    title: string
    url: string
    domain: string
    confidence: number
    excerpt?: string
  }
}

export interface ResearchCompleteAnnotation {
  type: 'research-complete'
  data: {
    phase: 'complete'
    success: boolean
    metadata?: AnnotationMetadata
    interactionId?: string
  }
}

export interface RelatedQuestionsAnnotation {
  type: 'related-questions'
  data: { items: Array<{ query: string }> }
}

export interface ThoughtStepAnnotation {
  type: 'thought-step'
  data: { id: string; summary: string; details?: string[]; timestamp: number }
}

export type AgenticPhase = 'searching' | 'answering' | 'complete'

export interface AgenticPhaseAnnotation {
  type: 'agentic-phase'
  data: { phase: AgenticPhase; sourceCount: number; startTime?: number }
}

export type ResearchAnnotation =
  | ResearchPhaseAnnotation
  | ResearchProgressAnnotation
  | ResearchSourceAnnotation
  | ResearchCompleteAnnotation
  | RelatedQuestionsAnnotation
  | ThoughtStepAnnotation
  | AgenticPhaseAnnotation

export type { UISource as Source }
