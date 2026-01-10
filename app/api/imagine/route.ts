/**
 * Image Generation API Route (Nano Banana Pro)
 *
 * Handles text-to-image generation and image editing using gemini-3-pro-image-preview.
 * Supports streaming responses for real-time progress updates.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { z } from 'zod'

import { isGeminiAvailable } from '@/lib/gemini'
import {
  generateImageStream,
  MAX_REFERENCE_IMAGES,
  validateAspectRatio,
  validateImageSize
} from '@/lib/gemini/image-generation'
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_SIZES,
  ImageAspectRatio,
  ImageSize,
  ReferenceImage
} from '@/lib/gemini/types'
import { SUPPORTED_IMAGE_TYPES } from '@/lib/types'

// Extended timeout for image generation (2 minutes)
export const maxDuration = 120

// ============================================
// Request Validation Schema
// ============================================

/**
 * Schema for reference images
 */
const ReferenceImageSchema = z.object({
  data: z.string().min(1, 'Image data is required'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
})

/**
 * Schema for image generation request
 */
const ImagineRequestSchema = z.object({
  /** Text prompt describing the image to generate */
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),

  /** Reference images for editing (optional, max 14) */
  referenceImages: z
    .array(ReferenceImageSchema)
    .max(MAX_REFERENCE_IMAGES, `Maximum ${MAX_REFERENCE_IMAGES} images allowed`)
    .optional(),

  /** Output aspect ratio */
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).default('1:1'),

  /** Output resolution */
  imageSize: z.enum(IMAGE_SIZES).default('1K'),

  /** Whether to include text explanation with the image */
  includeText: z.boolean().default(false)
})

type ImagineRequest = z.infer<typeof ImagineRequestSchema>

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
    const validation = ImagineRequestSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => {
        const path = e.path.join('.')
        return path ? `${path}: ${e.message}` : e.message
      })
      return new Response(JSON.stringify({ error: errors.join('; ') }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { prompt, referenceImages, aspectRatio, imageSize, includeText } =
      validation.data

    // Validate aspect ratio and image size (redundant but safe)
    const validatedAspectRatio =
      validateAspectRatio(aspectRatio) || ('1:1' as ImageAspectRatio)
    const validatedImageSize =
      validateImageSize(imageSize) || ('1K' as ImageSize)

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream image generation chunks
          for await (const chunk of generateImageStream(
            prompt,
            referenceImages as ReferenceImage[] | undefined,
            {
              aspectRatio: validatedAspectRatio,
              imageSize: validatedImageSize,
              responseModalities: includeText ? ['TEXT', 'IMAGE'] : ['IMAGE']
            }
          )) {
            // Format as Server-Sent Events for easy parsing
            const data = JSON.stringify(chunk)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          // Signal end of stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          const errorChunk = JSON.stringify({
            type: 'image-error',
            error: errorMessage
          })
          controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`))
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
    console.error('Image generation API error:', error)
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
