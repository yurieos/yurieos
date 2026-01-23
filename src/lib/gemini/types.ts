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
  model?: string
  thinkingConfig?: ThinkingConfig
  conversationHistory?: ConversationTurn[]
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
