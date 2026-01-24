/**
 * Shared Types
 * Consolidated type definitions for the application
 */

import type { JSONValue, ModelMessage } from 'ai'

// ============================================
// Chat Types
// ============================================

export interface Chat extends Record<string, unknown> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: ExtendedCoreMessage[]
}

// ExtendedCoreMessage for saving messages
export type ExtendedCoreMessage = Omit<ModelMessage, 'role' | 'content'> & {
  role: ModelMessage['role'] | 'data'
  content: ModelMessage['content'] | JSONValue
}

// ============================================
// Model Types
// ============================================

export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  toolCallModel?: string
}

// ============================================
// UI Message Part Types
// Used for rendering message content in components
// ============================================

/** Text part from UI message */
export interface MessageTextPart {
  type: 'text'
  text: string
}

// ============================================
// Annotation Types - Used for streaming
// ============================================

export interface ThoughtStepAnnotation {
  type: 'thought-step'
  data: { id: string; summary: string; details?: string[]; timestamp: number }
}

export type AgenticPhase = 'searching' | 'answering' | 'complete'

export interface AgenticPhaseAnnotation {
  type: 'agentic-phase'
  data: { phase: AgenticPhase; sourceCount: number; startTime?: number }
}

export interface ResearchCompleteAnnotation {
  type: 'research-complete'
  data: {
    phase: 'complete'
    success: boolean
  }
}

export type ResearchAnnotation =
  | ThoughtStepAnnotation
  | AgenticPhaseAnnotation
  | ResearchCompleteAnnotation
