/**
 * Gemini Video Generation Module (Veo 3.1)
 *
 * Video generation using Veo 3.1 models with support for:
 * - Text-to-video generation
 * - Image-to-video (first frame animation)
 * - Frame interpolation (first + last frame)
 * - Reference images for style/content guidance
 * - Video extension
 *
 * @see https://ai.google.dev/gemini-api/docs/video
 */

import { GoogleGenAI } from '@google/genai'

import { getGeminiClient } from './core'
import { checkFinishReason } from './function-calling'
import { withGeminiRetry } from './retry'
import type {
  GeneratedVideo,
  ReferenceImage,
  VideoGenerationChunk,
  VideoGenerationConfig,
  VideoGenerationResult,
  VideoOperation
} from './types'

// ============================================
// SDK Type Helpers
// The Gemini SDK has specific types for video generation.
// We use Record<string, unknown> to allow flexibility while still
// providing structure for our internal code.
// ============================================

/**
 * Build reference images configuration for SDK call
 */
function buildReferenceImagesConfig(referenceImages: ReferenceImage[]): Array<{
  image: { imageBytes: string; mimeType: string }
  referenceType: string
}> {
  return referenceImages.map(img => ({
    image: {
      imageBytes: img.data,
      mimeType: img.mimeType
    },
    referenceType: 'ASSET'
  }))
}

/**
 * Build video input for extension operations
 */
function buildVideoInput(video: {
  uri?: string
  videoBytes?: Uint8Array
}): Record<string, unknown> {
  return {
    uri: video.uri,
    videoBytes: video.videoBytes
  }
}

// ============================================
// Constants
// ============================================

/**
 * Veo 3.1 model for high-quality video generation
 * Features: 720p/1080p, 4-8s duration, audio generation
 * @see https://ai.google.dev/gemini-api/docs/video#model-versions
 */
export const VEO_3_1 = 'veo-3.1-generate-preview'

/**
 * Veo 3.1 Fast model for speed-optimized generation
 * Ideal for rapid prototyping and A/B testing
 * @see https://ai.google.dev/gemini-api/docs/video#model-versions
 */
export const VEO_3_1_FAST = 'veo-3.1-fast-generate-preview'

/**
 * Default polling interval in milliseconds
 * Per docs: Poll every 10 seconds
 */
export const POLL_INTERVAL_MS = 10000

/**
 * Maximum polling duration in milliseconds (10 minutes)
 * Per docs: Max latency is 6 minutes during peak hours
 */
export const MAX_POLL_DURATION_MS = 10 * 60 * 1000

/**
 * Maximum number of reference images for Veo 3.1
 */
export const MAX_VIDEO_REFERENCE_IMAGES = 3

/**
 * Maximum input video duration for extension (in seconds)
 */
export const MAX_INPUT_VIDEO_DURATION = 141

/**
 * Maximum output video duration with extension (in seconds)
 */
export const MAX_OUTPUT_VIDEO_DURATION = 148

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: Required<
  Pick<VideoGenerationConfig, 'aspectRatio' | 'resolution' | 'durationSeconds'>
> = {
  aspectRatio: '16:9',
  resolution: '720p',
  durationSeconds: '8'
}

// ============================================
// Helper Functions
// ============================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get the model ID based on config
 */
function getModelId(config?: VideoGenerationConfig): string {
  return config?.useFastModel ? VEO_3_1_FAST : VEO_3_1
}

/**
 * Build the GenerateVideosConfig object for the API
 */
function buildVideoConfig(
  config?: VideoGenerationConfig
): Record<string, unknown> {
  const videoConfig: Record<string, unknown> = {}

  if (config?.aspectRatio) {
    videoConfig.aspectRatio = config.aspectRatio
  }

  if (config?.resolution) {
    videoConfig.resolution = config.resolution
  }

  if (config?.durationSeconds) {
    videoConfig.durationSeconds = parseInt(config.durationSeconds, 10)
  }

  if (config?.negativePrompt) {
    videoConfig.negativePrompt = config.negativePrompt
  }

  if (config?.personGeneration) {
    videoConfig.personGeneration = config.personGeneration
  }

  if (config?.seed !== undefined) {
    videoConfig.seed = config.seed
  }

  return videoConfig
}

// ============================================
// Video Generation Functions
// ============================================

/**
 * Generate a video from a text prompt
 *
 * Best practices from Veo prompt guide:
 * - Include subject, action, style, camera motion, composition, ambiance
 * - Use quotes for dialogue cues
 * - Describe sound effects explicitly
 *
 * @param prompt - Text description of the video to generate
 * @param config - Generation configuration
 * @returns Async generator yielding progress chunks
 *
 * @example
 * ```ts
 * for await (const chunk of generateVideo(
 *   'A cinematic shot of a majestic lion in the savannah.',
 *   { aspectRatio: '16:9', durationSeconds: '8' }
 * )) {
 *   console.log(chunk.status)
 * }
 * ```
 */
export async function* generateVideo(
  prompt: string,
  config?: VideoGenerationConfig
): AsyncGenerator<VideoGenerationChunk> {
  const client = getGeminiClient()
  const model = getModelId(config)
  const videoConfig = buildVideoConfig({ ...DEFAULT_CONFIG, ...config })

  yield {
    type: 'video-starting',
    status: 'Starting video generation...'
  }

  try {
    // Start video generation - returns a long-running operation
    // Use retry for the initial call since it can fail transiently
    const operation = await withGeminiRetry(
      () =>
        client.models.generateVideos({
          model,
          prompt,
          config: videoConfig
        }),
      { maxRetries: 2, baseDelayMs: 2000 }
    )

    // Poll for completion
    yield* pollVideoOperation(operation as unknown as VideoOperation, client)
  } catch (error) {
    yield {
      type: 'video-error',
      error: error instanceof Error ? error.message : 'Video generation failed'
    }
  }
}

/**
 * Generate a video from an image (first frame)
 *
 * The image is used as the starting frame for the video.
 * Best for animating still images or creating videos from a specific composition.
 *
 * @param prompt - Text description of the video action
 * @param image - Image to use as the first frame
 * @param config - Generation configuration
 * @returns Async generator yielding progress chunks
 *
 * @example
 * ```ts
 * for await (const chunk of generateVideoFromImage(
 *   'Panning wide shot of a calico kitten sleeping in the sunshine',
 *   { data: base64Image, mimeType: 'image/png' },
 *   { aspectRatio: '16:9' }
 * )) {
 *   console.log(chunk.status)
 * }
 * ```
 */
export async function* generateVideoFromImage(
  prompt: string,
  image: ReferenceImage,
  config?: VideoGenerationConfig
): AsyncGenerator<VideoGenerationChunk> {
  const client = getGeminiClient()
  const model = getModelId(config)
  const videoConfig = buildVideoConfig({ ...DEFAULT_CONFIG, ...config })

  yield {
    type: 'video-starting',
    status: 'Starting image-to-video generation...'
  }

  try {
    // Start video generation with image
    // Note: The SDK expects base64 string for imageBytes
    const operation = await withGeminiRetry(
      () =>
        client.models.generateVideos({
          model,
          prompt,
          image: {
            imageBytes: image.data,
            mimeType: image.mimeType
          },
          config: videoConfig
        }),
      { maxRetries: 2, baseDelayMs: 2000 }
    )

    yield* pollVideoOperation(operation as unknown as VideoOperation, client)
  } catch (error) {
    yield {
      type: 'video-error',
      error:
        error instanceof Error
          ? error.message
          : 'Image-to-video generation failed'
    }
  }
}

/**
 * Generate a video using frame interpolation (first + last frame)
 *
 * Creates a video that transitions from the first frame to the last frame.
 * Note: Duration must be 8 seconds when using interpolation.
 *
 * @param prompt - Text description of the transition
 * @param firstFrame - Image for the first frame
 * @param lastFrame - Image for the last frame
 * @param config - Generation configuration (durationSeconds forced to '8')
 * @returns Async generator yielding progress chunks
 *
 * @example
 * ```ts
 * for await (const chunk of generateVideoWithInterpolation(
 *   'A ghostly woman slowly fades away from a swing',
 *   firstFrameImage,
 *   lastFrameImage
 * )) {
 *   console.log(chunk.status)
 * }
 * ```
 */
export async function* generateVideoWithInterpolation(
  prompt: string,
  firstFrame: ReferenceImage,
  lastFrame: ReferenceImage,
  config?: VideoGenerationConfig
): AsyncGenerator<VideoGenerationChunk> {
  const client = getGeminiClient()
  const model = getModelId(config)

  // Force duration to 8 seconds for interpolation
  const videoConfig = buildVideoConfig({
    ...DEFAULT_CONFIG,
    ...config,
    durationSeconds: '8'
  })

  yield {
    type: 'video-starting',
    status: 'Starting interpolation video generation...'
  }

  try {
    // Start video generation with first and last frames
    // Note: The SDK expects base64 string for imageBytes
    const operation = await client.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: firstFrame.data,
        mimeType: firstFrame.mimeType
      },
      config: {
        ...videoConfig,
        lastFrame: {
          imageBytes: lastFrame.data,
          mimeType: lastFrame.mimeType
        }
      }
    })

    yield* pollVideoOperation(operation as unknown as VideoOperation, client)
  } catch (error) {
    yield {
      type: 'video-error',
      error:
        error instanceof Error
          ? error.message
          : 'Interpolation video generation failed'
    }
  }
}

/**
 * Generate a video using reference images for style/content guidance
 *
 * Use up to 3 reference images to guide the video's content.
 * Good for preserving subject appearance (person, character, product).
 * Note: Duration must be 8 seconds when using reference images.
 *
 * @param prompt - Text description of the video
 * @param referenceImages - Up to 3 reference images
 * @param config - Generation configuration (durationSeconds forced to '8')
 * @returns Async generator yielding progress chunks
 *
 * @example
 * ```ts
 * for await (const chunk of generateVideoWithReferences(
 *   'A woman walks through a lagoon wearing a flamingo dress',
 *   [dressImage, womanImage, sunglassesImage]
 * )) {
 *   console.log(chunk.status)
 * }
 * ```
 */
export async function* generateVideoWithReferences(
  prompt: string,
  referenceImages: ReferenceImage[],
  config?: VideoGenerationConfig
): AsyncGenerator<VideoGenerationChunk> {
  // Validate reference image count
  if (referenceImages.length > MAX_VIDEO_REFERENCE_IMAGES) {
    yield {
      type: 'video-error',
      error: `Maximum ${MAX_VIDEO_REFERENCE_IMAGES} reference images allowed, got ${referenceImages.length}`
    }
    return
  }

  if (referenceImages.length === 0) {
    yield {
      type: 'video-error',
      error: 'At least one reference image is required'
    }
    return
  }

  const client = getGeminiClient()
  const model = getModelId(config)

  // Force duration to 8 seconds for reference images
  // Note: Reference images only support 16:9 aspect ratio
  const videoConfig = buildVideoConfig({
    ...DEFAULT_CONFIG,
    ...config,
    durationSeconds: '8',
    aspectRatio: '16:9'
  })

  yield {
    type: 'video-starting',
    status: 'Starting video generation with reference images...'
  }

  try {
    // Start video generation with reference images
    // Note: The SDK expects base64 string for imageBytes
    const configWithRefs = {
      ...videoConfig,
      referenceImages: buildReferenceImagesConfig(referenceImages)
    }

    // Use type assertion for SDK compatibility
    const operation = await client.models.generateVideos({
      model,
      prompt,
      config: configWithRefs as Record<string, unknown>
    })

    yield* pollVideoOperation(operation as unknown as VideoOperation, client)
  } catch (error) {
    yield {
      type: 'video-error',
      error:
        error instanceof Error
          ? error.message
          : 'Reference video generation failed'
    }
  }
}

/**
 * Extend an existing Veo-generated video
 *
 * Extends the video by 7 seconds (up to 20 extensions).
 * Input video must be from a previous Veo generation.
 * Note: Resolution must be 720p for extension.
 *
 * @param previousVideo - Video from a previous generation
 * @param prompt - Text description for the extension
 * @param config - Generation configuration (resolution forced to '720p')
 * @returns Async generator yielding progress chunks
 *
 * @example
 * ```ts
 * for await (const chunk of extendVideo(
 *   previousGeneratedVideo,
 *   'Continue tracking the butterfly as it lands on a flower'
 * )) {
 *   console.log(chunk.status)
 * }
 * ```
 */
export async function* extendVideo(
  previousVideo: GeneratedVideo,
  prompt: string,
  config?: VideoGenerationConfig
): AsyncGenerator<VideoGenerationChunk> {
  const client = getGeminiClient()
  const model = getModelId(config)

  // Force resolution to 720p for extension
  const videoConfig = buildVideoConfig({
    ...DEFAULT_CONFIG,
    ...config,
    resolution: '720p',
    durationSeconds: '8'
  })

  yield {
    type: 'video-starting',
    status: 'Starting video extension...'
  }

  try {
    // Start video extension
    // Build video input from previous generation
    const videoInput = buildVideoInput({
      uri: previousVideo.video?.uri,
      videoBytes: previousVideo.video?.videoBytes
    })

    // Use type assertion for SDK compatibility
    const operation = await client.models.generateVideos({
      model,
      prompt,
      video: videoInput as Record<string, unknown>,
      config: {
        ...videoConfig,
        numberOfVideos: 1
      }
    })

    yield* pollVideoOperation(operation as unknown as VideoOperation, client)
  } catch (error) {
    yield {
      type: 'video-error',
      error: error instanceof Error ? error.message : 'Video extension failed'
    }
  }
}

// ============================================
// Polling and Download Functions
// ============================================

/**
 * Poll a video generation operation until completion
 *
 * @param operation - The operation to poll
 * @param client - Gemini client instance
 * @returns Async generator yielding progress chunks
 */
async function* pollVideoOperation(
  operation: VideoOperation,

  client: any // Using any for SDK compatibility across versions
): AsyncGenerator<VideoGenerationChunk> {
  const startTime = Date.now()
  let currentOperation = operation
  let pollCount = 0

  while (!currentOperation.done) {
    // Check for timeout
    if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
      yield {
        type: 'video-error',
        error: 'Video generation timed out. Please try again.'
      }
      return
    }

    pollCount++
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)

    yield {
      type: 'video-progress',
      status: `Generating video... (${elapsedSeconds}s elapsed)`,
      progress: Math.min(95, pollCount * 5) // Estimate progress
    }

    // Wait before next poll
    await sleep(POLL_INTERVAL_MS)

    // Get updated operation status with retry for transient failures
    try {
      const updatedOp = await withGeminiRetry(
        () =>
          client.operations.getVideosOperation({
            operation: currentOperation
          }),
        { maxRetries: 2, baseDelayMs: 1000 }
      )
      // Cast to our VideoOperation type for consistent handling
      currentOperation = updatedOp as unknown as VideoOperation
    } catch (error) {
      yield {
        type: 'video-error',
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check generation status'
      }
      return
    }
  }

  // Check for errors in completed operation
  if (currentOperation.error) {
    yield {
      type: 'video-error',
      error: currentOperation.error.message || 'Video generation failed',
      blocked:
        currentOperation.error.message?.includes('safety') ||
        currentOperation.error.message?.includes('blocked'),
      blockReason: currentOperation.error.message
    }
    return
  }

  // Get the generated video
  const generatedVideos = currentOperation.response?.generatedVideos
  if (!generatedVideos || generatedVideos.length === 0) {
    yield {
      type: 'video-error',
      error: 'No video was generated'
    }
    return
  }

  const video = generatedVideos[0]

  // Download the video from URI
  try {
    yield {
      type: 'video-progress',
      status: 'Downloading generated video...',
      progress: 98
    }

    // Get the video URI
    const videoUri = video.video?.uri
    if (!videoUri) {
      yield {
        type: 'video-error',
        error: 'No video URI returned from generation'
      }
      return
    }

    // Fetch video from URI with API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey || ''
      }
    })

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const base64Data = Buffer.from(videoBuffer).toString('base64')

    yield {
      type: 'video-complete',
      status: 'Video generation complete!',
      progress: 100,
      videoData: {
        data: base64Data,
        mimeType: 'video/mp4'
      },
      videoUri
    }
  } catch (error) {
    yield {
      type: 'video-error',
      error: error instanceof Error ? error.message : 'Failed to download video'
    }
  }
}

/**
 * Download a generated video by its URI
 *
 * Videos are stored on Gemini servers for 2 days.
 * Download immediately after generation for permanent storage.
 *
 * @param videoUri - URI of the video to download
 * @returns Video data as base64 string
 */
export async function downloadVideo(
  videoUri: string
): Promise<VideoGenerationResult> {
  try {
    // Fetch video from URI with API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey || ''
      }
    })

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const base64Data = Buffer.from(videoBuffer).toString('base64')

    return {
      videoData: base64Data,
      mimeType: 'video/mp4',
      videoUri
    }
  } catch (error) {
    return {
      mimeType: 'video/mp4',
      blocked: false,
      blockReason:
        error instanceof Error ? error.message : 'Failed to download video'
    }
  }
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate video generation config constraints
 *
 * @param config - Configuration to validate
 * @param mode - Generation mode
 * @returns Validation result with any errors
 */
export function validateVideoConfig(
  config: VideoGenerationConfig,
  mode:
    | 'text-to-video'
    | 'image-to-video'
    | 'interpolation'
    | 'reference'
    | 'extend'
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1080p only supports 8s duration
  if (config.resolution === '1080p' && config.durationSeconds !== '8') {
    errors.push('1080p resolution only supports 8 second duration')
  }

  // Interpolation, reference images, and extension require 8s duration
  if (
    (mode === 'interpolation' || mode === 'reference' || mode === 'extend') &&
    config.durationSeconds !== '8'
  ) {
    errors.push(`${mode} mode requires 8 second duration`)
  }

  // Extension requires 720p
  if (mode === 'extend' && config.resolution !== '720p') {
    errors.push('Video extension only supports 720p resolution')
  }

  // Reference images only support 16:9
  if (mode === 'reference' && config.aspectRatio !== '16:9') {
    errors.push('Reference images only support 16:9 aspect ratio')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
