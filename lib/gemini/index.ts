/**
 * Gemini Module - Main Entry Point
 *
 * Two modes of operation:
 * - Standard Mode (Agentic): Gemini 3 Flash with tools (Google Search, Code Execution)
 * - Deep Research Mode: Official Deep Research Agent via Interactions API
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/code-execution
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

// Core (Client + Citations)
export {
  deduplicateSources,
  DEEP_RESEARCH_MODEL,
  extractDomain,
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  getGeminiClient,
  isGeminiAvailable,
  parseGroundingMetadata
} from './core'

// Types
export type {
  ContentPart,
  ConversationTurn,
  DeepResearchInteractionMetadata,
  DeepResearchOptions,
  GeminiCandidate,
  GeminiContent,
  GeminiResponsePart,
  GroundingMetadata,
  GroundingSegment,
  GroundingSource,
  GroundingSupport,
  GroundingSupportItem,
  ResearchChunk,
  ResearchConfig,
  ResearchPhase,
  ThinkingConfig,
  WebGroundingChunk
} from './types'

// Agentic workflow
export {
  agenticChat,
  deepResearch,
  generateFollowUps,
  process
} from './agentic'

// Deep Research Agent (Interactions API)
export {
  askFollowUp,
  executeDeepResearch,
  reconnectToResearch
} from './deep-research-agent'

// System Instructions (Agentic Template)
// @see https://ai.google.dev/gemini-api/docs/prompting-strategies#agentic-si-template
export {
  getDeepResearchFormatInstructions,
  getFollowUpPrompt,
  getStandardSystemInstruction
} from './system-instructions'

// Streaming (Vercel AI SDK compatible)
export type { GeminiStreamConfig } from './streaming'
export { createGeminiStreamResponse } from './streaming'

// Safety (included in core)
export type { SafetyResult } from './core'
export { processInputSafely } from './core'
