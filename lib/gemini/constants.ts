/**
 * Gemini API Constants
 *
 * Centralized constants for the Gemini module.
 * Consolidates limits, model IDs, and configuration defaults.
 *
 * @see https://ai.google.dev/gemini-api/docs
 */

// ============================================
// Model Constants
// These are also exported from core.ts for convenience
// ============================================

/**
 * Gemini 3 Flash model ID - balanced speed and quality
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_3_FLASH = 'gemini-3-flash-preview'

/**
 * Gemini 3 Pro model ID - highest quality
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_3_PRO = 'gemini-3-pro-preview'

/**
 * Gemini Image Flash model ID - fast image generation
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const GEMINI_IMAGE_FLASH = 'gemini-3-flash-image-preview'

/**
 * Gemini Image Pro model ID - high quality image generation
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const GEMINI_IMAGE_PRO = 'gemini-3-pro-image-preview'

/**
 * Deep Research Agent model ID
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */
export const DEEP_RESEARCH_MODEL = 'deep-research-pro-preview-12-2025'

/**
 * Veo 3.1 model for high-quality video generation
 * @see https://ai.google.dev/gemini-api/docs/video
 */
export const VEO_3_1 = 'veo-3.1-generate-preview'

/**
 * Veo 3.1 Fast model for speed-optimized generation
 * @see https://ai.google.dev/gemini-api/docs/video
 */
export const VEO_3_1_FAST = 'veo-3.1-fast-generate-preview'

// ============================================
// API Limits
// ============================================

export const LIMITS = {
  // URL Context Limits
  // @see https://ai.google.dev/gemini-api/docs/url-context
  /** Maximum URLs per request */
  MAX_URLS_PER_REQUEST: 20,
  /** Maximum content size for URL context in MB */
  MAX_URL_CONTENT_SIZE_MB: 34,

  // Inline Data Limits
  // @see https://ai.google.dev/gemini-api/docs/vision
  /** Maximum inline data size in MB */
  MAX_INLINE_SIZE_MB: 20,

  // Function Calling Limits
  // @see https://ai.google.dev/gemini-api/docs/function-calling
  /** Maximum function declarations per request */
  MAX_FUNCTIONS: 20,

  // Conversation Limits
  /** Maximum messages per request (recommended) */
  MAX_MESSAGES_PER_REQUEST: 100,

  // Image Generation Limits
  // @see https://ai.google.dev/gemini-api/docs/image-generation
  /** Maximum reference images for image generation */
  MAX_REFERENCE_IMAGES: 14,
  /** Maximum output images per request */
  MAX_OUTPUT_IMAGES: 4,

  // Video Generation Limits
  // @see https://ai.google.dev/gemini-api/docs/video
  /** Maximum input video duration in seconds */
  MAX_INPUT_VIDEO_DURATION_S: 141,
  /** Maximum output video duration in seconds */
  MAX_OUTPUT_VIDEO_DURATION_S: 148,
  /** Maximum reference images for video generation */
  MAX_VIDEO_REFERENCE_IMAGES: 3,

  // Token Limits (approximate)
  // @see https://ai.google.dev/gemini-api/docs/tokens
  /** Approximate input token limit for Gemini 3 Flash */
  GEMINI_3_FLASH_INPUT_TOKENS: 1_000_000,
  /** Approximate output token limit for Gemini 3 Flash */
  GEMINI_3_FLASH_OUTPUT_TOKENS: 65_536,
  /** Approximate input token limit for Gemini 3 Pro */
  GEMINI_3_PRO_INPUT_TOKENS: 1_000_000,
  /** Approximate output token limit for Gemini 3 Pro */
  GEMINI_3_PRO_OUTPUT_TOKENS: 65_536
} as const

// ============================================
// Timing Constants
// ============================================

export const TIMING = {
  // Video Generation Polling
  // @see https://ai.google.dev/gemini-api/docs/video
  /** Polling interval in milliseconds */
  VIDEO_POLL_INTERVAL_MS: 10_000,
  /** Maximum polling duration in milliseconds (10 minutes) */
  VIDEO_MAX_POLL_DURATION_MS: 10 * 60 * 1000,

  // Retry Configuration
  /** Default base delay for retries in milliseconds */
  DEFAULT_RETRY_BASE_DELAY_MS: 1_000,
  /** Maximum retry delay in milliseconds */
  DEFAULT_RETRY_MAX_DELAY_MS: 30_000,

  // Streaming
  /** Minimum interval between annotation writes in milliseconds */
  ANNOTATION_WRITE_INTERVAL_MS: 100,

  // Deep Research
  // @see https://ai.google.dev/gemini-api/docs/deep-research
  /** Keep-alive heartbeat interval during deep research (30 seconds) */
  DEEP_RESEARCH_HEARTBEAT_MS: 30_000,
  /** Maximum deep research duration in milliseconds (60 minutes per docs) */
  DEEP_RESEARCH_MAX_DURATION_MS: 60 * 60 * 1000,
  /** Typical deep research duration in milliseconds (5-20 minutes) */
  DEEP_RESEARCH_TYPICAL_DURATION_MS: 20 * 60 * 1000
} as const

// ============================================
// Default Configurations
// ============================================

export const DEFAULTS = {
  // Temperature Settings
  // @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
  /** Temperature for function calling (deterministic) */
  FUNCTION_CALLING_TEMPERATURE: 0,
  /** Temperature for Gemini 3 with native tools (avoid looping) */
  GEMINI_3_NATIVE_TOOLS_TEMPERATURE: 1.0,
  /** Temperature for older models with native tools */
  LEGACY_NATIVE_TOOLS_TEMPERATURE: 0.4,

  // Image Generation
  /** Default aspect ratio for images */
  IMAGE_ASPECT_RATIO: '1:1' as const,
  /** Default image size */
  IMAGE_SIZE: '1K' as const,

  // Video Generation
  /** Default aspect ratio for videos */
  VIDEO_ASPECT_RATIO: '16:9' as const,
  /** Default video resolution */
  VIDEO_RESOLUTION: '720p' as const,
  /** Default video duration in seconds */
  VIDEO_DURATION_SECONDS: '8' as const
} as const

// ============================================
// Supported Formats
// ============================================

export const SUPPORTED_FORMATS = {
  // Code Execution supported formats
  // @see https://ai.google.dev/gemini-api/docs/code-execution#io-details
  CODE_EXECUTION_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/xml',
    'text/x-c++src', // .cpp
    'text/x-java', // .java
    'text/x-python', // .py
    'text/javascript', // .js
    'text/typescript' // .ts
  ],

  // Image formats
  // @see https://ai.google.dev/gemini-api/docs/vision
  IMAGE_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif'
  ],

  // Video formats
  // @see https://ai.google.dev/gemini-api/docs/vision
  VIDEO_MIME_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],

  // Audio formats
  // @see https://ai.google.dev/gemini-api/docs/audio
  AUDIO_MIME_TYPES: [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/flac',
    'audio/aac'
  ],

  // Document formats
  // @see https://ai.google.dev/gemini-api/docs/document-processing
  DOCUMENT_MIME_TYPES: ['application/pdf']
} as const

// ============================================
// Response Modalities
// ============================================

export const MODALITIES = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO'
} as const

// ============================================
// Finish Reasons
// @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
// ============================================

export const FINISH_REASONS = {
  /** Normal completion */
  STOP: 'STOP',
  /** Token limit reached */
  MAX_TOKENS: 'MAX_TOKENS',
  /** Safety filter triggered */
  SAFETY: 'SAFETY',
  /** Content too similar to training data */
  RECITATION: 'RECITATION',
  /** Other/unknown reason */
  OTHER: 'OTHER'
} as const

// ============================================
// Function Calling Modes
// @see https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
// ============================================

export const FUNCTION_CALLING_MODES = {
  /** Model decides when to call functions */
  AUTO: 'AUTO',
  /** Force function calls */
  ANY: 'ANY',
  /** Disable function calling */
  NONE: 'NONE',
  /** Guarantee function schema adherence */
  VALIDATED: 'VALIDATED'
} as const

// ============================================
// Thinking Levels
// @see https://ai.google.dev/gemini-api/docs/thinking
// ============================================

export const THINKING_LEVELS = {
  /** No extended thinking */
  NONE: 'none',
  /** Minimal thinking for simple tasks */
  MINIMAL: 'minimal',
  /** Low thinking for straightforward tasks */
  LOW: 'low',
  /** Medium thinking for moderate complexity */
  MEDIUM: 'medium',
  /** High thinking for complex reasoning */
  HIGH: 'high'
} as const
