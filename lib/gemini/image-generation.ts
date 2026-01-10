/**
 * Gemini Image Generation Module (Nano Banana Pro)
 *
 * Native image generation using gemini-3-pro-image-preview model.
 * Features: 4K resolution, text rendering, thinking mode, multi-turn editing.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import type { Content, Part } from '@google/genai'

import { GEMINI_IMAGE_FLASH, GEMINI_IMAGE_PRO, getGeminiClient } from './core'
import type {
  GeneratedImagePart,
  ImageAspectRatio,
  ImageConversationTurn,
  ImageGenerationChunk,
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageSize,
  ReferenceImage
} from './types'

// ============================================
// Constants
// ============================================

/**
 * Maximum number of reference images supported
 * Per docs: 6 high-fidelity objects + 5 humans for character consistency = 14 total
 * @see https://ai.google.dev/gemini-api/docs/image-generation#reference-images
 */
export const MAX_REFERENCE_IMAGES = 14

/**
 * Maximum number of images to generate per request
 */
export const MAX_OUTPUT_IMAGES = 4

/**
 * Default configuration for image generation
 */
const DEFAULT_CONFIG: Required<
  Pick<
    ImageGenerationConfig,
    'aspectRatio' | 'imageSize' | 'responseModalities'
  >
> = {
  aspectRatio: '1:1',
  imageSize: '1K',
  responseModalities: ['IMAGE']
}

// ============================================
// Image Generation Functions
// ============================================

/**
 * Generate an image from a text prompt
 *
 * Best practices from Gemini docs:
 * - Use narrative descriptions, not keywords
 * - Describe the scene with context and intent
 * - Be specific about style, composition, and mood
 *
 * @param prompt - Text description of the image to generate
 * @param config - Generation configuration
 * @returns Generated image(s) and optional text
 *
 * @example
 * ```ts
 * const result = await generateImage(
 *   'A serene Japanese garden at sunset with a red maple tree',
 *   { aspectRatio: '16:9', imageSize: '2K' }
 * )
 * ```
 */
export async function generateImage(
  prompt: string,
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const client = getGeminiClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Use Flash model for speed or Pro model for quality
  const model = config?.useFlashModel ? GEMINI_IMAGE_FLASH : GEMINI_IMAGE_PRO

  // Build imageConfig per official docs
  // Note: Flash model only supports 1024px, so imageSize only applies to Pro
  const imageConfig: Record<string, string> = {
    aspectRatio: mergedConfig.aspectRatio
  }

  // Only add imageSize for Pro model (Flash is fixed at 1024px)
  if (!config?.useFlashModel && mergedConfig.imageSize) {
    imageConfig.imageSize = mergedConfig.imageSize
  }

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    config: {
      responseModalities: mergedConfig.responseModalities,
      imageConfig
    }
  })

  return parseImageResponse(response)
}

/**
 * Edit an image using reference images and a text prompt
 *
 * Supports up to 14 reference images for:
 * - Style transfer
 * - Object consistency
 * - Character consistency (up to 5 humans + 6 objects)
 *
 * @param prompt - Edit instruction
 * @param referenceImages - Images to use as reference (up to 14)
 * @param config - Generation configuration
 * @returns Edited image(s) and optional text
 *
 * @example
 * ```ts
 * const result = await editImage(
 *   'Transform this into a watercolor painting style',
 *   [{ data: base64Image, mimeType: 'image/jpeg' }],
 *   { aspectRatio: '1:1' }
 * )
 * ```
 */
export async function editImage(
  prompt: string,
  referenceImages: ReferenceImage[],
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  // Validate reference images count based on model
  // Flash works best with up to 3, Pro supports up to 14
  const maxImages = config?.useFlashModel ? 3 : MAX_REFERENCE_IMAGES
  if (referenceImages.length > maxImages) {
    throw new Error(
      `Maximum ${maxImages} reference images allowed for ${config?.useFlashModel ? 'Flash' : 'Pro'} model, got ${referenceImages.length}`
    )
  }

  const client = getGeminiClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Use Flash model for speed or Pro model for quality
  const model = config?.useFlashModel ? GEMINI_IMAGE_FLASH : GEMINI_IMAGE_PRO

  // Build parts array: text prompt + reference images
  const parts: Part[] = [
    { text: prompt },
    ...referenceImages.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    }))
  ]

  // Build imageConfig per official docs
  const imageConfig: Record<string, string> = {
    aspectRatio: mergedConfig.aspectRatio
  }

  // Only add imageSize for Pro model (Flash is fixed at 1024px)
  if (!config?.useFlashModel && mergedConfig.imageSize) {
    imageConfig.imageSize = mergedConfig.imageSize
  }

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts
      }
    ],
    config: {
      responseModalities: mergedConfig.responseModalities,
      imageConfig
    }
  })

  return parseImageResponse(response)
}

/**
 * Multi-turn image editing with conversation history
 *
 * Preserves thought signatures for iterative refinement.
 * Per docs: Pass thought signatures back exactly as received.
 *
 * @param prompt - New edit instruction
 * @param conversationHistory - Previous turns with thought signatures
 * @param config - Generation configuration
 * @returns Edited image(s) with new thought signatures
 *
 * @example
 * ```ts
 * const result = await refineImage(
 *   'Make the sky more dramatic with storm clouds',
 *   [
 *     { role: 'user', text: 'A mountain landscape', images: [] },
 *     { role: 'model', images: [previousResult.images[0]] }
 *   ]
 * )
 * ```
 */
export async function refineImage(
  prompt: string,
  conversationHistory: ImageConversationTurn[],
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const client = getGeminiClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Use Flash model for speed or Pro model for quality
  const model = config?.useFlashModel ? GEMINI_IMAGE_FLASH : GEMINI_IMAGE_PRO

  // Build conversation contents from history
  const contents: Content[] = conversationHistory.map(turn => ({
    role: turn.role,
    parts: buildTurnParts(turn)
  }))

  // Add the new user prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  })

  // Build imageConfig per official docs
  const imageConfig: Record<string, string> = {
    aspectRatio: mergedConfig.aspectRatio
  }

  // Only add imageSize for Pro model (Flash is fixed at 1024px)
  if (!config?.useFlashModel && mergedConfig.imageSize) {
    imageConfig.imageSize = mergedConfig.imageSize
  }

  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      responseModalities: mergedConfig.responseModalities,
      imageConfig
    }
  })

  return parseImageResponse(response)
}

/**
 * Stream image generation for real-time progress updates
 *
 * Yields chunks for:
 * - Generation status (thinking, generating)
 * - Interim thinking images
 * - Final generated images
 *
 * @param prompt - Text description of the image
 * @param referenceImages - Optional reference images
 * @param config - Generation configuration
 * @yields Image generation chunks
 */
export async function* generateImageStream(
  prompt: string,
  referenceImages?: ReferenceImage[],
  config?: ImageGenerationConfig
): AsyncGenerator<ImageGenerationChunk> {
  // Validate reference images count based on model
  // Flash works best with up to 3, Pro supports up to 14
  const maxImages = config?.useFlashModel ? 3 : MAX_REFERENCE_IMAGES
  if (referenceImages && referenceImages.length > maxImages) {
    yield {
      type: 'image-error',
      error: `Maximum ${maxImages} reference images allowed for ${config?.useFlashModel ? 'Flash' : 'Pro'} model`
    }
    return
  }

  const client = getGeminiClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Use Flash model for speed or Pro model for quality
  const model = config?.useFlashModel ? GEMINI_IMAGE_FLASH : GEMINI_IMAGE_PRO

  // Build parts array
  const parts: Part[] = [{ text: prompt }]

  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      })
    }
  }

  // Build imageConfig per official docs
  const imageConfig: Record<string, string> = {
    aspectRatio: mergedConfig.aspectRatio
  }

  // Only add imageSize for Pro model (Flash is fixed at 1024px)
  if (!config?.useFlashModel && mergedConfig.imageSize) {
    imageConfig.imageSize = mergedConfig.imageSize
  }

  // Signal generation start
  yield {
    type: 'image-generating',
    status: 'Generating image...'
  }

  try {
    // Use streaming API
    const streamResult = await client.models.generateContentStream({
      model,
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      config: {
        responseModalities: mergedConfig.responseModalities,
        imageConfig
      }
    })

    let hasYieldedImage = false

    // Process stream chunks
    for await (const chunk of streamResult) {
      // Check for safety block
      const candidate = chunk.candidates?.[0]
      if (candidate?.finishReason === 'SAFETY') {
        yield {
          type: 'image-error',
          blocked: true,
          blockReason: 'Content blocked by safety filters'
        }
        return
      }

      // Process parts in the chunk
      const parts = candidate?.content?.parts || []
      for (const part of parts) {
        // Handle thought/interim images
        if (part.thought && part.inlineData) {
          yield {
            type: 'image-thought',
            status: 'Processing thinking image...',
            imageData: {
              data: part.inlineData.data || '',
              mimeType: part.inlineData.mimeType || 'image/png',
              thoughtSignature: part.thoughtSignature
            }
          }
        }
        // Handle final generated image
        else if (part.inlineData && !part.thought) {
          hasYieldedImage = true
          yield {
            type: 'image-output',
            status: 'Image generated',
            imageData: {
              data: part.inlineData.data || '',
              mimeType: part.inlineData.mimeType || 'image/png',
              thoughtSignature: part.thoughtSignature
            }
          }
        }
        // Handle text content
        else if (part.text) {
          yield {
            type: 'image-text',
            text: part.text
          }
        }
      }
    }

    // Signal completion
    yield {
      type: 'image-complete',
      status: hasYieldedImage
        ? 'Image generation complete'
        : 'No image generated'
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    // Check for safety-related errors
    if (
      errorMessage.includes('safety') ||
      errorMessage.includes('SAFETY') ||
      errorMessage.includes('blocked')
    ) {
      yield {
        type: 'image-error',
        blocked: true,
        blockReason: errorMessage
      }
    } else {
      yield {
        type: 'image-error',
        error: errorMessage
      }
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Build parts array from a conversation turn
 */
function buildTurnParts(turn: ImageConversationTurn): Part[] {
  const parts: Part[] = []

  // Add text if present
  if (turn.text) {
    parts.push({ text: turn.text })
  }

  // Add images if present
  if (turn.images && turn.images.length > 0) {
    for (const img of turn.images) {
      // Check if it's a GeneratedImagePart (has thoughtSignature) or ReferenceImage
      if ('thoughtSignature' in img && img.thoughtSignature) {
        // Generated image with thought signature - preserve it
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          },
          thoughtSignature: img.thoughtSignature
        } as Part)
      } else {
        // Reference image or generated image without thought signature
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        })
      }
    }
  }

  return parts
}

/**
 * Parse Gemini response into ImageGenerationResult
 */
function parseImageResponse(response: unknown): ImageGenerationResult {
  const result: ImageGenerationResult = {
    images: [],
    thinkingImages: []
  }

  // Type assertion for response structure
  const resp = response as {
    candidates?: Array<{
      content?: { parts?: Part[] }
      finishReason?: string
    }>
  }

  const candidate = resp.candidates?.[0]

  // Check for safety block
  if (candidate?.finishReason === 'SAFETY') {
    return {
      images: [],
      blocked: true,
      blockReason: 'Content blocked by safety filters'
    }
  }

  const parts = candidate?.content?.parts || []

  for (const part of parts) {
    // Type assertion for part with potential properties
    const typedPart = part as Part & {
      thought?: boolean
      thoughtSignature?: string
      inlineData?: { data?: string; mimeType?: string }
    }

    // Thought/interim images
    if (typedPart.thought && typedPart.inlineData) {
      result.thinkingImages?.push({
        data: typedPart.inlineData.data || '',
        mimeType: typedPart.inlineData.mimeType || 'image/png',
        thoughtSignature: typedPart.thoughtSignature
      })
    }
    // Final generated images
    else if (typedPart.inlineData && !typedPart.thought) {
      result.images.push({
        data: typedPart.inlineData.data || '',
        mimeType: typedPart.inlineData.mimeType || 'image/png',
        thoughtSignature: typedPart.thoughtSignature
      })
    }
    // Text content
    else if (typedPart.text) {
      result.text = (result.text || '') + typedPart.text
    }
  }

  return result
}

/**
 * Validate and normalize aspect ratio
 */
export function validateAspectRatio(ratio: string): ImageAspectRatio | null {
  const validRatios: ImageAspectRatio[] = [
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
  ]
  return validRatios.includes(ratio as ImageAspectRatio)
    ? (ratio as ImageAspectRatio)
    : null
}

/**
 * Validate and normalize image size
 */
export function validateImageSize(size: string): ImageSize | null {
  const validSizes: ImageSize[] = ['1K', '2K', '4K']
  return validSizes.includes(size as ImageSize) ? (size as ImageSize) : null
}

/**
 * Best practice: Generate text first for images with text
 * Per docs: "Generate text first, then create image with text"
 *
 * @param textContent - The text to include in the image
 * @param style - Description of the text style
 * @returns Formatted prompt for text-in-image generation
 */
export function createTextImagePrompt(
  textContent: string,
  style: string
): string {
  return `Create an image with the following text: "${textContent}". Style the text as: ${style}. Ensure the text is clearly legible and properly rendered.`
}
