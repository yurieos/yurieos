/**
 * Gemini Module - Main Entry Point
 *
 * Simplified AI architecture using Google GenAI SDK
 * - Standard Mode: Gemini 3 Flash with Google Search grounding
 * - Deep Research: Official Deep Research Agent via Interactions API
 *
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

// Client
export {
  DEEP_RESEARCH_MODEL,
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  getGeminiClient,
  isGeminiAvailable
} from './client'

// Types
export type {
  ContentPart,
  ConversationTurn,
  DeepResearchInteractionMetadata,
  DeepResearchOptions,
  GroundingSource,
  GroundingSupport,
  ResearchChunk,
  ResearchConfig,
  ResearchPhase,
  ThinkingConfig
} from './types'

// Research
export {
  deepResearch,
  generateFollowUps,
  research,
  standardResearch
} from './research'

// Deep Research Agent (Interactions API)
export { askFollowUp, executeDeepResearch } from './deep-research-agent'

// System Instructions (Agentic Template)
// @see https://ai.google.dev/gemini-api/docs/prompting-strategies#agentic-si-template
export {
  getDeepResearchFormatInstructions,
  getFollowUpPrompt,
  getStandardSystemInstruction
} from './system-instructions'

// Citations
export {
  deduplicateSources,
  extractDomain,
  parseGroundingMetadata
} from './citations'

// Streaming (Vercel AI SDK compatible)
export type { GeminiStreamConfig } from './streaming'
export { createGeminiStreamResponse } from './streaming'

// Safety
export type { SafetyResult } from './safety'
export { processInputSafely } from './safety'
