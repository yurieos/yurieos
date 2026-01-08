/**
 * Shared Source Types
 * Common interfaces for sources across research modes
 */

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

// Legacy type alias for backwards compatibility
export type QuickSearchPhase = AgenticPhase
export type QuickSearchPhaseAnnotation = AgenticPhaseAnnotation

export type ResearchAnnotation =
  | ResearchPhaseAnnotation
  | ResearchProgressAnnotation
  | ResearchSourceAnnotation
  | ResearchCompleteAnnotation
  | RelatedQuestionsAnnotation
  | ThoughtStepAnnotation
  | AgenticPhaseAnnotation

export type { UISource as Source }
