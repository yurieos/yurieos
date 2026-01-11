/**
 * Video Generation API Route (Veo 3.1)
 *
 * Handles video generation using Veo 3.1 models with support for:
 * - Text-to-video generation
 * - Image-to-video (first frame animation)
 * - Frame interpolation (first + last frame)
 * - Reference images for style/content guidance
 * - Video extension
 *
 * Uses SSE streaming for real-time progress updates during long-running operations.
 *
 * @see https://ai.google.dev/gemini-api/docs/video
 */

import { isGeminiAvailable } from '@/lib/gemini'
import type {
  ReferenceImage,
  VideoGenerationChunk,
  VideoGenerationConfig
} from '@/lib/gemini/types'
import {
  extendVideo,
  generateVideo,
  generateVideoFromImage,
  generateVideoWithInterpolation,
  generateVideoWithReferences
} from '@/lib/gemini/video-generation'
import {
  getValidatedVideoConfig,
  VideoGenerationRequestSchema
} from '@/lib/schema/video'

// Extended timeout for video generation (10 minutes)
// Per docs: Max latency is 6 minutes during peak hours
export const maxDuration = 600

// ============================================
// API Route Handler
// ============================================

export async function POST(req: Request) {
  try {
    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return new Response(
        JSON.stringify({
          error: 'Gemini API key is required',
          hint: 'Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment variables'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate request
    const validation = VideoGenerationRequestSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues.map(e => {
        const path = e.path.join('.')
        return path ? `${path}: ${e.message}` : e.message
      })
      return new Response(JSON.stringify({ error: errors.join('; ') }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Apply config constraints based on mode
    const validatedRequest = getValidatedVideoConfig(validation.data)

    const {
      prompt,
      mode,
      aspectRatio,
      resolution,
      durationSeconds,
      negativePrompt,
      personGeneration,
      seed,
      useFastModel,
      firstFrameImage,
      lastFrameImage,
      referenceImages,
      inputVideoUri
    } = validatedRequest

    // Build video generation config
    const config: VideoGenerationConfig = {
      aspectRatio,
      resolution,
      durationSeconds,
      negativePrompt,
      personGeneration,
      seed,
      useFastModel
    }

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Select the appropriate generator based on mode
          let generator: AsyncGenerator<VideoGenerationChunk>

          switch (mode) {
            case 'text-to-video':
              generator = generateVideo(prompt, config)
              break

            case 'image-to-video':
              if (!firstFrameImage) {
                const errorChunk: VideoGenerationChunk = {
                  type: 'video-error',
                  error: 'First frame image is required for image-to-video mode'
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
                )
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }
              generator = generateVideoFromImage(
                prompt,
                firstFrameImage as ReferenceImage,
                config
              )
              break

            case 'interpolation':
              if (!firstFrameImage || !lastFrameImage) {
                const errorChunk: VideoGenerationChunk = {
                  type: 'video-error',
                  error:
                    'Both first and last frame images are required for interpolation mode'
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
                )
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }
              generator = generateVideoWithInterpolation(
                prompt,
                firstFrameImage as ReferenceImage,
                lastFrameImage as ReferenceImage,
                config
              )
              break

            case 'reference':
              if (!referenceImages || referenceImages.length === 0) {
                const errorChunk: VideoGenerationChunk = {
                  type: 'video-error',
                  error:
                    'At least one reference image is required for reference mode'
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
                )
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }
              generator = generateVideoWithReferences(
                prompt,
                referenceImages as ReferenceImage[],
                config
              )
              break

            case 'extend':
              if (!inputVideoUri) {
                const errorChunk: VideoGenerationChunk = {
                  type: 'video-error',
                  error: 'Input video URI is required for extend mode'
                }
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
                )
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                return
              }
              generator = extendVideo(
                { video: { uri: inputVideoUri } },
                prompt,
                config
              )
              break

            default:
              const unknownModeChunk: VideoGenerationChunk = {
                type: 'video-error',
                error: `Unknown generation mode: ${mode}`
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(unknownModeChunk)}\n\n`)
              )
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              return
          }

          // Stream chunks from the generator
          for await (const chunk of generator) {
            const data = JSON.stringify(chunk)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          // Signal end of stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          const errorChunk: VideoGenerationChunk = {
            type: 'video-error',
            error: errorMessage
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Video generation API error:', error)
    return new Response(
      JSON.stringify({
        error: 'Error processing your request',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
