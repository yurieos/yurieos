/**
 * Gemini Research Types
 */

import { ThinkingConfig } from '@/lib/types/models'
export type { ThinkingConfig }

// Source Types
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
