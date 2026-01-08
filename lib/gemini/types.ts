/**
 * Gemini Research Types
 *
 * Type definitions for Gemini API responses and internal data structures.
 * @see https://ai.google.dev/gemini-api/docs
 */

import { ThinkingConfig } from '@/lib/types/models'
export type { ThinkingConfig }

// ============================================
// Gemini API Response Types
// ============================================

/**
 * Web grounding chunk from Google Search
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */
export interface WebGroundingChunk {
  web?: {
    uri: string
    title?: string
  }
}

/**
 * Text segment with position information
 */
export interface GroundingSegment {
  text?: string
  startIndex?: number
  endIndex?: number
}

/**
 * Support mapping between text and sources
 */
export interface GroundingSupportItem {
  segment?: GroundingSegment
  groundingChunkIndices?: number[]
}

/**
 * Grounding metadata from Gemini response
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */
export interface GroundingMetadata {
  groundingChunks?: WebGroundingChunk[]
  groundingSupports?: GroundingSupportItem[]
  webSearchQueries?: string[]
}

/**
 * Content part from Gemini response
 */
export interface GeminiResponsePart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
}

/**
 * Content from Gemini response
 */
export interface GeminiContent {
  parts?: GeminiResponsePart[]
  role?: string
}

/**
 * Candidate from Gemini generateContent response
 * @see https://ai.google.dev/gemini-api/docs/text-generation
 */
export interface GeminiCandidate {
  content?: GeminiContent
  groundingMetadata?: GroundingMetadata
  finishReason?: string
  safetyRatings?: Array<{
    category: string
    probability: string
  }>
}

// ============================================
// Internal Source Types
// ============================================

/**
 * Parsed grounding source for UI display
 */
export interface GroundingSource {
  id: string
  title: string
  url: string
  domain: string
}
export interface GroundingSupport {
  text: string
  startIndex: number
  endIndex: number
  sourceIndices: number[]
}

// Research Phases (re-exported from sources to avoid duplication)
import type { ResearchPhase } from '@/lib/types/sources'
export type { ResearchPhase }

// Content part with optional thought signature (per https://ai.google.dev/gemini-api/docs/thought-signatures)
export interface ContentPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

// Conversation turn with full parts to preserve thought signatures
export interface ConversationTurn {
  role: 'user' | 'model'
  content?: string
  parts?: ContentPart[]
}

// Streaming Chunks
export interface ResearchChunk {
  type:
    | 'phase'
    | 'progress'
    | 'source'
    | 'sources'
    | 'content'
    | 'thought'
    | 'followup'
    | 'complete'
    | 'error'
    | 'model-parts'
  content?: string
  phase?: ResearchPhase
  source?: GroundingSource
  sources?: GroundingSource[]
  followUpQuestions?: string[]
  metadata?: {
    sourceCount?: number
    searchQueries?: string[]
    confidence?: number
    interactionId?: string
    lastEventId?: string
    previousInteractionId?: string
  }
  error?: string
  modelParts?: ContentPart[]
}

// Research Config
export interface ResearchConfig {
  mode?: 'standard' | 'deep-research'
  model?: string
  thinkingConfig?: ThinkingConfig
  conversationHistory?: ConversationTurn[]
  previousInteractionId?: string
}

// Deep Research Types (Interactions API)
export interface DeepResearchOptions {
  thinkingSummaries?: boolean
  formatInstructions?: string
  previousInteractionId?: string
}

export interface DeepResearchInteractionMetadata {
  interactionId?: string
  lastEventId?: string
  previousInteractionId?: string
}
