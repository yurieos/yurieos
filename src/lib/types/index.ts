/**
 * Shared Types
 * Consolidated type definitions for the application
 */

import type { JSONValue, ModelMessage } from 'ai'

// ============================================
// Chat Types
// ============================================

export type SearchResults = {
  images: SearchResultImage[]
  results: SearchResultItem[]
  number_of_results?: number
  query: string
}

// If enabled the include_images_description is true, the images will be an array of { url: string, description: string }
// Otherwise, the images will be an array of strings
export type SearchResultImage =
  | string
  | {
      url: string
      description: string
      number_of_results?: number
    }

export type SearchResultItem = {
  title: string
  url: string
  content: string
}

export interface Chat extends Record<string, unknown> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: ExtendedCoreMessage[] // Note: Changed from AIMessage to ExtendedCoreMessage
}

// ExtendedCoreMessage for saving annotations
export type ExtendedCoreMessage = Omit<ModelMessage, 'role' | 'content'> & {
  role: ModelMessage['role'] | 'data'
  content: ModelMessage['content'] | JSONValue
}

// ============================================
// Image Attachment Types
// @see https://ai.google.dev/gemini-api/docs/image-understanding
// ============================================

/**
 * Supported image MIME types for Gemini
 * @see https://ai.google.dev/gemini-api/docs/image-understanding#supported-image-formats
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif'
] as const

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

/**
 * Maximum image file size in MB for inline data
 * Inline data limits total request size to 20MB
 * @see https://ai.google.dev/gemini-api/docs/image-understanding#inline-image
 */
export const MAX_IMAGE_SIZE_MB = 20

/**
 * Maximum number of images per message
 * Gemini supports up to 3,600 images per request, but we limit for UX
 */
export const MAX_IMAGES_PER_MESSAGE = 5

/**
 * Image attachment for chat messages (frontend state)
 */
export interface ImageAttachment {
  /** Unique identifier for the attachment */
  id: string
  /** Original file object */
  file: File
  /** Object URL for preview */
  previewUrl: string
  /** MIME type of the image */
  mimeType: SupportedImageType
  /** Base64 encoded data (populated before sending) */
  base64?: string
}

/**
 * Image part for API transmission
 * Matches Gemini inlineData format
 * @see https://ai.google.dev/gemini-api/docs/image-understanding#inline-image
 */
export interface ImagePart {
  type: 'image'
  mimeType: SupportedImageType
  /** Base64 encoded data (for Gemini API) */
  data: string
  /** Attachment ID for persistent storage (optional, for authenticated users) */
  attachmentId?: string
  /** Original filename (optional) */
  filename?: string
}

// ============================================
// Video Attachment Types
// @see https://ai.google.dev/gemini-api/docs/video-understanding
// ============================================

/**
 * Supported video MIME types for Gemini
 * @see https://ai.google.dev/gemini-api/docs/video-understanding#supported-video-formats
 */
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp'
] as const

export type SupportedVideoType = (typeof SUPPORTED_VIDEO_TYPES)[number]

/**
 * Maximum video file size in MB for inline data
 * Inline data limits total request size to 20MB
 * @see https://ai.google.dev/gemini-api/docs/video-understanding#inline-video
 */
export const MAX_VIDEO_INLINE_SIZE_MB = 20

/**
 * Maximum video file size in MB for File API upload
 * Reasonable limit for user uploads
 */
export const MAX_VIDEO_FILE_SIZE_MB = 100

/**
 * YouTube URL regex pattern for validation
 * Matches youtube.com/watch, youtu.be, and youtube.com/embed formats
 */
export const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/

/**
 * Video attachment for chat messages (frontend state)
 */
export interface VideoAttachment {
  /** Unique identifier for the attachment */
  id: string
  /** Original file object (for local uploads) */
  file?: File
  /** YouTube URL (for YouTube videos) */
  youtubeUrl?: string
  /** Object URL for preview (local) or thumbnail URL (YouTube) */
  previewUrl?: string
  /** MIME type of the video */
  mimeType?: SupportedVideoType
  /** Base64 encoded data (populated before sending for inline) */
  base64?: string
  /** File URI from Gemini File API (for large uploads) */
  fileUri?: string
  /** Whether file is currently uploading to File API */
  isUploading?: boolean
  /** Upload progress percentage (0-100) */
  uploadProgress?: number
}

/**
 * Video part for API transmission
 * Supports inline data, File API URI, and YouTube URLs
 * @see https://ai.google.dev/gemini-api/docs/video-understanding
 */
export interface VideoPart {
  type: 'video'
  /** MIME type (for inline or File API) */
  mimeType?: SupportedVideoType
  /** Base64 encoded data (for inline videos < 20MB) */
  data?: string
  /** File URI (for File API uploads or YouTube URLs) */
  fileUri?: string
  /** Attachment ID for persistent storage (optional, for authenticated users) */
  attachmentId?: string
  /** Original filename (optional) */
  filename?: string
}

// ============================================
// Document Attachment Types
// @see https://ai.google.dev/gemini-api/docs/document-processing
// ============================================

/**
 * Supported document MIME types for Gemini
 * Note: Only PDF has native vision support; other types are treated as plain text
 * @see https://ai.google.dev/gemini-api/docs/document-processing#document-types
 */
export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'] as const

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number]

/**
 * Maximum document file size in MB for inline data
 * Use File API for larger documents to improve latency
 * @see https://ai.google.dev/gemini-api/docs/document-processing#passing-pdf-data-inline
 */
export const MAX_DOCUMENT_INLINE_SIZE_MB = 20

/**
 * Maximum document file size in MB for File API upload
 * Gemini hard limit: 50MB or 1000 pages
 * @see https://ai.google.dev/gemini-api/docs/document-processing#technical-details
 */
export const MAX_DOCUMENT_FILE_SIZE_MB = 50

/**
 * Maximum number of pages per document
 * Gemini hard limit
 * @see https://ai.google.dev/gemini-api/docs/document-processing#technical-details
 */
export const MAX_DOCUMENT_PAGES = 1000

/**
 * Document attachment for chat messages (frontend state)
 */
export interface DocumentAttachment {
  /** Unique identifier for the attachment */
  id: string
  /** Original file object */
  file?: File
  /** Filename for display */
  filename?: string
  /** MIME type of the document */
  mimeType: SupportedDocumentType
  /** Base64 encoded data (populated before sending for inline) */
  base64?: string
  /** File URI from Gemini File API (for large uploads) */
  fileUri?: string
  /** Whether file is currently uploading to File API */
  isUploading?: boolean
  /** Upload progress percentage (0-100) */
  uploadProgress?: number
  /** Page count if known */
  pageCount?: number
}

/**
 * Document part for API transmission
 * Supports inline data (base64) and File API URI
 * @see https://ai.google.dev/gemini-api/docs/document-processing
 */
export interface DocumentPart {
  type: 'document'
  /** MIME type (always application/pdf for vision support) */
  mimeType: SupportedDocumentType
  /** Base64 encoded data (for inline documents <= 20MB) */
  data?: string
  /** File URI (for File API uploads > 20MB) */
  fileUri?: string
  /** Attachment ID for persistent storage (optional, for authenticated users) */
  attachmentId?: string
  /** Original filename (optional) */
  filename?: string
}

// ============================================
// Audio Attachment Types
// @see https://ai.google.dev/gemini-api/docs/audio
// ============================================

/**
 * Supported audio MIME types for Gemini
 * Includes both Gemini canonical types and browser-reported MIME types
 * @see https://ai.google.dev/gemini-api/docs/audio#supported-audio-formats
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/wav',
  'audio/wave', // Browser variant of WAV
  'audio/x-wav', // Browser variant of WAV
  'audio/mp3',
  'audio/mpeg', // Browser reports MP3 as audio/mpeg
  'audio/aiff',
  'audio/x-aiff', // Browser variant of AIFF
  'audio/aac',
  'audio/x-aac', // Browser variant of AAC
  'audio/ogg',
  'audio/flac',
  'audio/x-flac' // Browser variant of FLAC
] as const

export type SupportedAudioType = (typeof SUPPORTED_AUDIO_TYPES)[number]

/**
 * Maximum audio file size in MB for inline data
 * Use File API for larger audio files
 * @see https://ai.google.dev/gemini-api/docs/audio#inline-audio
 */
export const MAX_AUDIO_INLINE_SIZE_MB = 20

/**
 * Maximum audio file size in MB for File API upload
 * Reasonable limit for user uploads
 */
export const MAX_AUDIO_FILE_SIZE_MB = 50

/**
 * Audio attachment for chat messages (frontend state)
 */
export interface AudioAttachment {
  /** Unique identifier for the attachment */
  id: string
  /** Original file object */
  file?: File
  /** Filename for display */
  filename?: string
  /** MIME type of the audio */
  mimeType: SupportedAudioType
  /** Base64 encoded data (populated before sending for inline) */
  base64?: string
  /** File URI from Gemini File API (for large uploads) */
  fileUri?: string
  /** Whether file is currently uploading to File API */
  isUploading?: boolean
  /** Upload progress percentage (0-100) */
  uploadProgress?: number
  /** Duration in seconds if known */
  duration?: number
}

/**
 * Audio part for API transmission
 * Supports inline data (base64) and File API URI
 * @see https://ai.google.dev/gemini-api/docs/audio
 */
export interface AudioPart {
  type: 'audio'
  /** MIME type of the audio */
  mimeType: SupportedAudioType
  /** Base64 encoded data (for inline audio <= 20MB) */
  data?: string
  /** File URI (for File API uploads > 20MB) */
  fileUri?: string
  /** Attachment ID for persistent storage (optional, for authenticated users) */
  attachmentId?: string
  /** Original filename (optional) */
  filename?: string
}

// ============================================
// Model Types
// @see https://ai.google.dev/gemini-api/docs/gemini-3
// @see https://ai.google.dev/gemini-api/docs/thinking
// ============================================

/**
 * Thinking configuration for Gemini 3 models
 */
export interface ThinkingConfig {
  /**
   * Thinking level for Gemini 3 models
   * Controls the maximum depth of reasoning before producing a response.
   *
   * Gemini 3 Pro and Flash:
   * - low: Minimizes latency and cost. Best for simple tasks, chat, or high-throughput
   * - high: (Default) Maximizes reasoning depth. Longer time to first token.
   *
   * Gemini 3 Flash only:
   * - minimal: Near-zero thinking for most queries. Fastest responses.
   * - medium: Balanced thinking for most tasks.
   */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'

  /**
   * Whether to include thought summaries in responses
   * Provides insights into the model's reasoning process
   */
  includeThoughts?: boolean
}

export interface Model {
  id: string
  name: string
  provider: string
  providerId: string
  enabled: boolean
  toolCallType: 'native' | 'manual'
  toolCallModel?: string

  /**
   * Thinking configuration for models that support it
   * @see https://ai.google.dev/gemini-api/docs/thinking
   */
  thinkingConfig?: ThinkingConfig
}

// ============================================
// Source Types
// ============================================

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

/**
 * Function call annotation - emitted when functions are being called
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */
export interface FunctionCallAnnotation {
  type: 'function-call'
  data: {
    calls: Array<{
      id: string
      name: string
      args: Record<string, unknown>
      timestamp: number
    }>
  }
}

/**
 * Function result annotation - emitted when function execution completes
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */
export interface FunctionResultAnnotation {
  type: 'function-result'
  data: {
    results: Array<{
      name: string
      response: Record<string, unknown>
      success: boolean
      timestamp: number
    }>
  }
}

/**
 * URL context annotation - emitted when URLs are retrieved by the model
 * Contains retrieval status for each URL processed
 * @see https://ai.google.dev/gemini-api/docs/url-context
 */
export interface UrlContextAnnotation {
  type: 'url-context'
  data: {
    urls: Array<{
      /** The URL that was retrieved */
      url: string
      /** The retrieval status (e.g., URL_RETRIEVAL_STATUS_SUCCESS) */
      status: string
      /** Whether the URL was successfully retrieved */
      success: boolean
    }>
  }
}

/**
 * Image generation annotation - emitted during image generation
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export interface ImageGenerationAnnotation {
  type: 'image-generation'
  data: {
    /** Current status of the generation */
    status: 'generating' | 'thinking' | 'complete' | 'error'
    /** Generated image data (base64) */
    imageData?: string
    /** MIME type of the generated image */
    mimeType?: string
    /** Aspect ratio of the generated image */
    aspectRatio?: string
    /** Resolution of the generated image */
    imageSize?: string
    /** Text explanation if provided */
    text?: string
    /** Error message if status is error */
    error?: string
    /** Whether blocked by safety filters */
    blocked?: boolean
    /** Block reason if blocked */
    blockReason?: string
    /**
     * Thought signature for multi-turn editing
     * Must be preserved and passed back for follow-up edits
     */
    thoughtSignature?: string
  }
}

export type ResearchAnnotation =
  | ResearchPhaseAnnotation
  | ResearchProgressAnnotation
  | ResearchSourceAnnotation
  | ResearchCompleteAnnotation
  | RelatedQuestionsAnnotation
  | ThoughtStepAnnotation
  | AgenticPhaseAnnotation
  | FunctionCallAnnotation
  | FunctionResultAnnotation
  | UrlContextAnnotation
  | ImageGenerationAnnotation

export type { UISource as Source }

// ============================================
// UI Message Part Types
// Used for rendering message content in components
// ============================================

/** Text part from UI message */
export interface MessageTextPart {
  type: 'text'
  text: string
}

/** Image part from UI message */
export interface MessageImagePart {
  type: 'image'
  mimeType: string
  data?: string // base64 (optional if attachmentId is set)
  attachmentId?: string // For Supabase Storage
  filename?: string
}

/** Video part from UI message */
export interface MessageVideoPart {
  type: 'video'
  mimeType?: string
  data?: string // base64 for inline (optional if attachmentId or fileUri is set)
  fileUri?: string // For YouTube or File API
  attachmentId?: string // For Supabase Storage
  filename?: string
}

/** Document part from UI message */
export interface MessageDocumentPart {
  type: 'document'
  mimeType: string
  data?: string // base64 for inline (optional if attachmentId or fileUri is set)
  fileUri?: string // For File API
  attachmentId?: string // For Supabase Storage
  filename?: string
}

/** Audio part from UI message */
export interface MessageAudioPart {
  type: 'audio'
  mimeType: string
  data?: string // base64 for inline (optional if attachmentId or fileUri is set)
  fileUri?: string // For File API
  attachmentId?: string // For Supabase Storage
  filename?: string
}
