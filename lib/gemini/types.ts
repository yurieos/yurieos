/**
 * Gemini Research Types
 *
 * Type definitions for Gemini API responses and internal data structures.
 * @see https://ai.google.dev/gemini-api/docs
 */

import type {
  AudioPart,
  DocumentPart,
  ImagePart,
  SupportedAudioType,
  SupportedDocumentType,
  SupportedImageType,
  SupportedVideoType,
  ThinkingConfig,
  VideoPart
} from '@/lib/types'

// Function Calling Types
// @see https://ai.google.dev/gemini-api/docs/function-calling
import type {
  FunctionCall,
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionResponse
} from './function-calling/types'
export type {
  FunctionCall,
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionResponse
}

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

// ============================================
// URL Context Types
// @see https://ai.google.dev/gemini-api/docs/url-context
// ============================================

/**
 * URL retrieval status from Gemini API
 * @see https://ai.google.dev/api/generate-content#UrlContextMetadata
 */
export type UrlRetrievalStatus =
  | 'URL_RETRIEVAL_STATUS_SUCCESS'
  | 'URL_RETRIEVAL_STATUS_ERROR'
  | 'URL_RETRIEVAL_STATUS_UNSAFE'
  | 'URL_RETRIEVAL_STATUS_UNSPECIFIED'

/**
 * Individual URL metadata from URL context tool
 * @see https://ai.google.dev/gemini-api/docs/url-context#understanding_the_response
 */
export interface UrlMetadata {
  /** The URL that was retrieved */
  retrievedUrl: string
  /** Status of the URL retrieval attempt */
  urlRetrievalStatus: UrlRetrievalStatus
}

/**
 * URL context metadata from response candidate
 * Contains the list of URLs retrieved and their status
 * @see https://ai.google.dev/gemini-api/docs/url-context#understanding_the_response
 */
export interface UrlContextMetadata {
  urlMetadata?: UrlMetadata[]
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
  /**
   * URL context metadata when urlContext tool is used
   * @see https://ai.google.dev/gemini-api/docs/url-context
   */
  urlContextMetadata?: UrlContextMetadata
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
import type { ResearchPhase } from '@/lib/types'
export type { ResearchPhase }

// Content part with optional thought signature (per https://ai.google.dev/gemini-api/docs/thought-signatures)
// Extended to support multimodal data:
// - Image inline data (per https://ai.google.dev/gemini-api/docs/image-understanding)
// - Video inline data and File API (per https://ai.google.dev/gemini-api/docs/video-understanding)
// - Document inline data and File API (per https://ai.google.dev/gemini-api/docs/document-processing)
// - Audio inline data and File API (per https://ai.google.dev/gemini-api/docs/audio)
export interface ContentPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
  /** Inline data for images/videos/documents/audio (base64 encoded) */
  inlineData?: {
    mimeType:
      | SupportedImageType
      | SupportedVideoType
      | SupportedDocumentType
      | SupportedAudioType
    data: string // base64 encoded
  }
  /**
   * File data for File API uploads or YouTube URLs
   * @see https://ai.google.dev/gemini-api/docs/video-understanding#upload-video
   * @see https://ai.google.dev/gemini-api/docs/video-understanding#youtube
   * @see https://ai.google.dev/gemini-api/docs/document-processing#large-pdfs
   * @see https://ai.google.dev/gemini-api/docs/audio#upload-audio
   */
  fileData?: {
    mimeType?: string
    fileUri: string
  }
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
    | 'function-call'
    | 'function-result'
    | 'url-context'
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
  /** Function calls from model response */
  functionCalls?: FunctionCall[]
  /** Function execution results */
  functionResults?: FunctionResponse[]
  /**
   * URL context metadata when URLs are retrieved
   * @see https://ai.google.dev/gemini-api/docs/url-context
   */
  urlContextMetadata?: UrlContextMetadata
}

// Research Config
export interface ResearchConfig {
  mode?: 'standard' | 'deep-research'
  model?: string
  thinkingConfig?: ThinkingConfig
  conversationHistory?: ConversationTurn[]
  previousInteractionId?: string
  /**
   * Image attachments for multimodal requests
   * @see https://ai.google.dev/gemini-api/docs/image-understanding
   */
  images?: ImagePart[]
  /**
   * Video attachments for multimodal requests
   * Supports inline data, File API uploads, and YouTube URLs
   * @see https://ai.google.dev/gemini-api/docs/video-understanding
   */
  videos?: VideoPart[]
  /**
   * Document attachments for multimodal requests (PDF)
   * Supports inline data and File API uploads
   * @see https://ai.google.dev/gemini-api/docs/document-processing
   */
  documents?: DocumentPart[]
  /**
   * Audio attachments for multimodal requests
   * Supports inline data and File API uploads
   * @see https://ai.google.dev/gemini-api/docs/audio
   */
  audios?: AudioPart[]
  /**
   * Custom function declarations for function calling
   * @see https://ai.google.dev/gemini-api/docs/function-calling
   */
  functions?: FunctionDeclaration[]
  /**
   * Function calling mode
   * - AUTO (default): Model decides when to call functions
   * - ANY: Force function calls
   * - NONE: Disable function calling
   * - VALIDATED: Schema adherence guaranteed
   * @see https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
   */
  functionCallingMode?: FunctionCallingMode
  /**
   * Restrict which functions can be called
   * Per best practice: Keep active set to 10-20 functions max
   */
  allowedFunctionNames?: string[]
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

// ============================================
// Image Generation Types (Nano Banana Pro)
// @see https://ai.google.dev/gemini-api/docs/image-generation
// ============================================

/**
 * Supported aspect ratios for image generation
 * @see https://ai.google.dev/gemini-api/docs/image-generation#aspect-ratios
 */
export const IMAGE_ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9'
] as const

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number]

/**
 * Supported output resolutions for Nano Banana Pro
 * @see https://ai.google.dev/gemini-api/docs/image-generation#resolutions
 */
export const IMAGE_SIZES = ['1K', '2K', '4K'] as const

export type ImageSize = (typeof IMAGE_SIZES)[number]

/**
 * Configuration for image generation requests
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export interface ImageGenerationConfig {
  /**
   * Output aspect ratio
   * @default '1:1'
   */
  aspectRatio?: ImageAspectRatio

  /**
   * Output resolution (only for Pro model - Flash is fixed at 1024px)
   * - 1K: ~1024px on longest side
   * - 2K: ~2048px on longest side
   * - 4K: ~4096px on longest side
   * Must use uppercase 'K' (e.g., '1K', '2K', '4K')
   * @default '1K'
   */
  imageSize?: ImageSize

  /**
   * Response modalities - what types of content to generate
   * - ['TEXT', 'IMAGE']: Return both text explanation and image
   * - ['IMAGE']: Return only image
   * @default ['IMAGE']
   */
  responseModalities?: ('TEXT' | 'IMAGE')[]

  /**
   * Use the Flash model (gemini-2.5-flash-image) for faster generation
   * - Flash: Optimized for speed/efficiency, 1024px output, best with up to 3 reference images
   * - Pro (default): Professional quality, up to 4K, thinking mode, up to 14 reference images
   * @default false (uses Pro model)
   */
  useFlashModel?: boolean
}

/**
 * Reference image for editing or style transfer
 * Supports up to 14 images (6 objects + 5 humans for character consistency)
 * @see https://ai.google.dev/gemini-api/docs/image-generation#reference-images
 */
export interface ReferenceImage {
  /** Base64 encoded image data */
  data: string
  /** MIME type of the image */
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/heic'
}

/**
 * Generated image part from Gemini response
 * Contains base64 encoded image data
 */
export interface GeneratedImagePart {
  /** Base64 encoded image data */
  data: string
  /** MIME type (typically image/png or image/jpeg) */
  mimeType: string
  /**
   * Thought signature for multi-turn editing
   * Must be passed back exactly as received for follow-up edits
   * @see https://ai.google.dev/gemini-api/docs/thought-signatures
   */
  thoughtSignature?: string
}

/**
 * Image generation result from Gemini
 */
export interface ImageGenerationResult {
  /** Generated images */
  images: GeneratedImagePart[]
  /** Text explanation if responseModalities included TEXT */
  text?: string
  /**
   * Thought process images (interim compositions)
   * Generated when thinking mode produces interim images
   */
  thinkingImages?: GeneratedImagePart[]
  /** Whether the generation was blocked by safety filters */
  blocked?: boolean
  /** Block reason if blocked */
  blockReason?: string
}

/**
 * Streaming chunk for image generation progress
 */
export interface ImageGenerationChunk {
  type:
    | 'image-generating'
    | 'image-thought'
    | 'image-output'
    | 'image-text'
    | 'image-complete'
    | 'image-error'
  /** Status message for progress display */
  status?: string
  /** Generated image data (for image-output and image-thought) */
  imageData?: GeneratedImagePart
  /** Text content (for image-text) */
  text?: string
  /** Error message (for image-error) */
  error?: string
  /** Safety block info */
  blocked?: boolean
  blockReason?: string
}

/**
 * Conversation turn for multi-turn image editing
 * Preserves thought signatures for iterative refinement
 */
export interface ImageConversationTurn {
  role: 'user' | 'model'
  /** Text prompt or response */
  text?: string
  /** Reference images (user) or generated images (model) */
  images?: ReferenceImage[] | GeneratedImagePart[]
}
