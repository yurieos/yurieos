/**
 * Gemini Module - Main Entry Point
 *
 * Agentic AI: Gemini 3 Flash/Pro with tools
 * - Google Search grounding
 * - URL Context analysis
 * - Code Execution
 * - Function Calling
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/url-context
 * @see https://ai.google.dev/gemini-api/docs/code-execution
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

// Core (Client + Citations + URL Context)
export type { UrlValidationResult } from './core'
export {
  deduplicateSources,
  deduplicateUrls,
  extractDomain,
  extractUrlsFromQuery,
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  GEMINI_IMAGE_FLASH,
  GEMINI_IMAGE_PRO,
  getGeminiClient,
  getUrlRetrievalSummary,
  isGeminiAvailable,
  isUrlLikelyAccessible,
  MAX_URL_CONTENT_SIZE_MB,
  MAX_URLS_PER_REQUEST,
  parseGroundingMetadata,
  parseUrlContextMetadata,
  processUrls,
  validateUrl,
  validateUrlCount
} from './core'

// Types from @/lib/types (re-exported for convenience)
export type { ThinkingConfig } from '@/lib/types'

// Types from ./types
export type {
  ContentPart,
  ConversationTurn,
  FunctionCall,
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionResponse,
  GeminiCandidate,
  GeminiContent,
  GeminiResponsePart,
  // Image generation types
  GeneratedImagePart,
  // Video generation types
  GeneratedVideo,
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
  VideoAspectRatio,
  VideoDuration,
  VideoGenerationChunk,
  VideoGenerationConfig,
  VideoGenerationMode,
  VideoGenerationResult,
  VideoOperation,
  VideoPersonGeneration,
  VideoReferenceImage,
  VideoResolution,
  WebGroundingChunk
} from './types'

// Image generation constants
export { IMAGE_ASPECT_RATIOS, IMAGE_SIZES } from './types'

// Video generation constants
export {
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS
} from './types'

// Agentic workflow
export { agenticChat, generateFollowUps, process } from './agentic'

// System Instructions (Agentic Template)
// @see https://ai.google.dev/gemini-api/docs/prompting-strategies#agentic-si-template
export {
  getFollowUpPrompt,
  getStandardSystemInstruction
} from './system-instructions'

// Streaming (Vercel AI SDK compatible)
export type { GeminiStreamConfig } from './streaming'
export { createGeminiStreamResponse } from './streaming'

// Safety (included in core)
export type { SafetyResult } from './core'
export { processInputSafely } from './core'

// Error Types and Utilities
// @see https://ai.google.dev/gemini-api/docs/troubleshooting
export {
  GeminiAuthError,
  GeminiError,
  GeminiModelError,
  GeminiNetworkError,
  GeminiQuotaError,
  GeminiRateLimitError,
  GeminiRecitationError,
  GeminiSafetyError,
  GeminiTimeoutError,
  GeminiTokenLimitError,
  GeminiValidationError,
  getUserFriendlyMessage,
  isRateLimitError,
  isRetryableError,
  isSafetyError,
  parseGeminiError
} from './errors'

// Retry Logic
export type { RetryConfig } from './retry'
export {
  createRetryWrapper,
  withGeminiRetry,
  withGeminiRetryStream
} from './retry'

// Centralized Constants
// @see https://ai.google.dev/gemini-api/docs
export {
  DEFAULTS,
  FINISH_REASONS,
  FUNCTION_CALLING_MODES,
  LIMITS,
  MODALITIES,
  SUPPORTED_FORMATS,
  THINKING_LEVELS,
  TIMING
} from './constants'

// Token Estimation
// @see https://ai.google.dev/gemini-api/docs/tokens
export type { TokenLimitResult } from './tokens'
export {
  checkTokenLimits,
  estimateMessageTokens,
  estimateTokenCount,
  estimateTotalTokens,
  getTokenSummary,
  truncateToTokenLimit
} from './tokens'

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

// Video Generation (Veo 3.1)
// @see https://ai.google.dev/gemini-api/docs/video
export {
  downloadVideo,
  extendVideo,
  generateVideo,
  generateVideoFromImage,
  generateVideoWithInterpolation,
  generateVideoWithReferences,
  MAX_INPUT_VIDEO_DURATION,
  MAX_OUTPUT_VIDEO_DURATION,
  MAX_POLL_DURATION_MS,
  MAX_VIDEO_REFERENCE_IMAGES,
  POLL_INTERVAL_MS,
  validateVideoConfig,
  VEO_3_1,
  VEO_3_1_FAST
} from './video-generation'

// Initialize built-in functions on module load
import { registerBuiltInFunctions } from './function-calling'
registerBuiltInFunctions()
