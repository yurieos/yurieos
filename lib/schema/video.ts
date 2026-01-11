/**
 * Video Schema
 *
 * Zod validation schemas for video generation and storage.
 * @see https://ai.google.dev/gemini-api/docs/video
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

export const VIDEO_ASPECT_RATIOS = ['16:9', '9:16'] as const
export const VIDEO_RESOLUTIONS = ['720p', '1080p'] as const
export const VIDEO_DURATIONS = ['4', '6', '8'] as const
export const VIDEO_GENERATION_MODES = [
  'text-to-video',
  'image-to-video',
  'interpolation',
  'reference',
  'extend'
] as const

// ============================================
// Input Schemas
// ============================================

/**
 * Schema for reference images in video generation
 */
export const VideoReferenceImageSchema = z.object({
  data: z.string().min(1, 'Image data is required'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
})

export type VideoReferenceImageInput = z.infer<typeof VideoReferenceImageSchema>

/**
 * Schema for video generation request
 */
export const VideoGenerationRequestSchema = z
  .object({
    /** Text prompt describing the video to generate */
    prompt: z
      .string()
      .min(1, 'Prompt is required')
      .max(10000, 'Prompt too long'),

    /** Video generation mode */
    mode: z.enum(VIDEO_GENERATION_MODES).default('text-to-video'),

    /** Output aspect ratio */
    aspectRatio: z.enum(VIDEO_ASPECT_RATIOS).default('16:9'),

    /** Output resolution */
    resolution: z.enum(VIDEO_RESOLUTIONS).default('720p'),

    /** Video duration in seconds */
    durationSeconds: z.enum(VIDEO_DURATIONS).default('8'),

    /** Negative prompt - what NOT to include */
    negativePrompt: z.string().max(5000, 'Negative prompt too long').optional(),

    /** Person generation control */
    personGeneration: z
      .enum(['allow_all', 'allow_adult', 'dont_allow'])
      .optional(),

    /** Seed for reproducibility (not guaranteed) */
    seed: z.number().int().positive().optional(),

    /** Use fast model for quicker generation */
    useFastModel: z.boolean().default(false),

    /** First frame image for image-to-video mode */
    firstFrameImage: VideoReferenceImageSchema.optional(),

    /** Last frame image for interpolation mode */
    lastFrameImage: VideoReferenceImageSchema.optional(),

    /** Reference images for style/content guidance (max 3) */
    referenceImages: z
      .array(VideoReferenceImageSchema)
      .max(3, 'Maximum 3 reference images allowed')
      .optional(),

    /** Input video URI for extension mode */
    inputVideoUri: z.string().url().optional()
  })
  .refine(
    data => {
      // 1080p only supports 8s duration
      if (data.resolution === '1080p' && data.durationSeconds !== '8') {
        return false
      }
      return true
    },
    {
      message: '1080p resolution only supports 8 second duration',
      path: ['resolution']
    }
  )
  .refine(
    data => {
      // image-to-video requires firstFrameImage
      if (data.mode === 'image-to-video' && !data.firstFrameImage) {
        return false
      }
      return true
    },
    {
      message: 'First frame image is required for image-to-video mode',
      path: ['firstFrameImage']
    }
  )
  .refine(
    data => {
      // interpolation requires both firstFrameImage and lastFrameImage
      if (data.mode === 'interpolation') {
        if (!data.firstFrameImage || !data.lastFrameImage) {
          return false
        }
      }
      return true
    },
    {
      message:
        'Both first and last frame images are required for interpolation mode',
      path: ['mode']
    }
  )
  .refine(
    data => {
      // reference mode requires referenceImages
      if (
        data.mode === 'reference' &&
        (!data.referenceImages || data.referenceImages.length === 0)
      ) {
        return false
      }
      return true
    },
    {
      message: 'At least one reference image is required for reference mode',
      path: ['referenceImages']
    }
  )
  .refine(
    data => {
      // extend mode requires inputVideoUri
      if (data.mode === 'extend' && !data.inputVideoUri) {
        return false
      }
      return true
    },
    {
      message: 'Input video URI is required for extend mode',
      path: ['inputVideoUri']
    }
  )
  .refine(
    data => {
      // Reference images only support 16:9
      if (data.mode === 'reference' && data.aspectRatio !== '16:9') {
        return false
      }
      return true
    },
    {
      message: 'Reference image mode only supports 16:9 aspect ratio',
      path: ['aspectRatio']
    }
  )
  .refine(
    data => {
      // Extension only supports 720p
      if (data.mode === 'extend' && data.resolution !== '720p') {
        return false
      }
      return true
    },
    {
      message: 'Video extension only supports 720p resolution',
      path: ['resolution']
    }
  )

export type VideoGenerationRequest = z.infer<
  typeof VideoGenerationRequestSchema
>

// ============================================
// Database Record Schemas
// ============================================

/**
 * Schema for a saved video record from the database
 */
export const SavedVideoSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),

  /** Owner's user ID */
  userId: z.string().uuid(),

  /** Storage path in Supabase Storage */
  storagePath: z.string(),

  /** Original generation prompt */
  prompt: z.string().nullable(),

  /** Video aspect ratio */
  aspectRatio: z.string().nullable(),

  /** Video resolution */
  resolution: z.string().nullable(),

  /** Video duration in seconds */
  durationSeconds: z.string().nullable(),

  /** MIME type */
  mimeType: z.string(),

  /** File size in bytes */
  fileSize: z.number().nullable(),

  /** Creation timestamp */
  createdAt: z.string().datetime(),

  /** Signed URL for playback (generated at query time) */
  url: z.string().url()
})

export type SavedVideo = z.infer<typeof SavedVideoSchema>

/**
 * Schema for database row (snake_case)
 */
export const UserVideoRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  storage_path: z.string(),
  prompt: z.string().nullable(),
  aspect_ratio: z.string().nullable(),
  resolution: z.string().nullable(),
  duration_seconds: z.string().nullable(),
  mime_type: z.string(),
  file_size: z.number().nullable(),
  created_at: z.string()
})

export type UserVideoRow = z.infer<typeof UserVideoRowSchema>

// ============================================
// API Response Schemas
// ============================================

/**
 * Schema for paginated videos response
 */
export const GetVideosResponseSchema = z.object({
  videos: z.array(SavedVideoSchema),
  nextPage: z.number().nullable()
})

export type GetVideosResponse = z.infer<typeof GetVideosResponseSchema>

/**
 * Schema for save video input
 */
export const SaveVideoInputSchema = z.object({
  /** Base64 encoded video data */
  videoData: z.string().min(1, 'Video data is required'),

  /** MIME type of the video */
  mimeType: z.enum(['video/mp4', 'video/webm']).default('video/mp4'),

  /** Original generation prompt */
  prompt: z.string().max(10000, 'Prompt too long').optional(),

  /** Video aspect ratio */
  aspectRatio: z.string().optional(),

  /** Video resolution */
  resolution: z.string().optional(),

  /** Video duration in seconds */
  durationSeconds: z.string().optional()
})

export type SaveVideoInput = z.infer<typeof SaveVideoInputSchema>

/**
 * Schema for save video success response
 */
export const SaveVideoResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url()
})

export type SaveVideoResponse = z.infer<typeof SaveVideoResponseSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Transform database row (snake_case) to SavedVideo (camelCase)
 */
export function transformRowToSavedVideo(
  row: UserVideoRow,
  url: string
): SavedVideo {
  return {
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
    prompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    durationSeconds: row.duration_seconds,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    url
  }
}

/**
 * Get file extension from MIME type
 */
export function getVideoExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm'
  }
  return extensions[mimeType] || 'mp4'
}

/**
 * Validate that the config is compatible with the selected mode
 */
export function getValidatedVideoConfig(
  request: VideoGenerationRequest
): VideoGenerationRequest {
  const validated = { ...request }

  // Force constraints based on mode
  switch (request.mode) {
    case 'interpolation':
    case 'reference':
    case 'extend':
      validated.durationSeconds = '8'
      break
  }

  if (request.mode === 'extend') {
    validated.resolution = '720p'
  }

  if (request.mode === 'reference') {
    validated.aspectRatio = '16:9'
  }

  // Force 8s for 1080p
  if (validated.resolution === '1080p') {
    validated.durationSeconds = '8'
  }

  return validated
}
