/**
 * Gemini Module - Main Entry Point
 *
 * Two modes of operation:
 * - Standard Mode (Agentic): Gemini 3 Flash with tools (Google Search, URL Context, Code Execution, Function Calling)
 * - Deep Research Mode: Official Deep Research Agent via Interactions API
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/url-context
 * @see https://ai.google.dev/gemini-api/docs/code-execution
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

// Core (Client + Citations + URL Context)
export {
  deduplicateSources,
  DEEP_RESEARCH_MODEL,
  extractDomain,
  extractUrlsFromQuery,
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  GEMINI_IMAGE_FLASH,
  GEMINI_IMAGE_PRO,
  getGeminiClient,
  getUrlRetrievalSummary,
  isGeminiAvailable,
  MAX_URL_CONTENT_SIZE_MB,
  MAX_URLS_PER_REQUEST,
  parseGroundingMetadata,
  parseUrlContextMetadata,
  validateUrlCount
} from './core'

// Types from @/lib/types (re-exported for convenience)
export type { ThinkingConfig } from '@/lib/types'

// Types from ./types
export type {
  ContentPart,
  ConversationTurn,
  DeepResearchInteractionMetadata,
  DeepResearchOptions,
  FunctionCall,
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionResponse,
  GeminiCandidate,
  GeminiContent,
  GeminiResponsePart,
  // Image generation types
  GeneratedImagePart,
  GroundingMetadata,
  GroundingSegment,
  GroundingSource,
  GroundingSupport,
  GroundingSupportItem,
  ImageAspectRatio,
  ImageConversationTurn,
  ImageGenerationChunk,
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageSize,
  ReferenceImage,
  ResearchChunk,
  ResearchConfig,
  ResearchPhase,
  UrlContextMetadata,
  UrlMetadata,
  UrlRetrievalStatus,
  WebGroundingChunk
} from './types'

// Image generation constants
export { IMAGE_ASPECT_RATIOS, IMAGE_SIZES } from './types'

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

// File API (for large video uploads)
// @see https://ai.google.dev/gemini-api/docs/files
export type { FileState, FileUploadProgress, UploadedFile } from './files'
export {
  deleteFile,
  getFileStatus,
  uploadAndWaitForVideo,
  uploadVideoToFileAPI,
  waitForProcessing
} from './files'

// Function Calling
// @see https://ai.google.dev/gemini-api/docs/function-calling
export type { RegisteredFunction } from './function-calling'
export {
  buildFunctionResponseParts,
  calculatorFunction,
  checkFinishReason,
  datetimeFunction,
  executeFunctionCalls,
  extractFunctionCalls,
  FunctionRegistry,
  functionRegistry,
  hasFunctionCalls,
  registerBuiltInFunctions,
  validateFunctionArgs,
  validateFunctionName
} from './function-calling'

// Image Generation (Nano Banana Pro)
// @see https://ai.google.dev/gemini-api/docs/image-generation
export {
  createTextImagePrompt,
  editImage,
  generateImage,
  generateImageStream,
  MAX_OUTPUT_IMAGES,
  MAX_REFERENCE_IMAGES,
  refineImage,
  validateAspectRatio,
  validateImageSize
} from './image-generation'

// Initialize built-in functions on module load
import { registerBuiltInFunctions } from './function-calling'
registerBuiltInFunctions()
