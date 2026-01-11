/**
 * Image Schema
 *
 * Zod validation schemas for the Your Stuff image storage feature.
 * @see /supabase/migrations/001_user_images.sql
 */

import { z } from 'zod'

// ============================================
// Input Schemas
// ============================================

/**
 * Schema for saving a new image
 */
export const SaveImageSchema = z.object({
  /** Base64 encoded image data (without data URL prefix) */
  imageData: z.string().min(1, 'Image data is required'),

  /** MIME type of the image */
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp'], {
    message: 'Invalid image type'
  }),

  /** Original generation prompt */
  prompt: z.string().max(10000, 'Prompt too long').optional(),

  /** Image aspect ratio */
  aspectRatio: z.string().optional(),

  /** Image resolution */
  imageSize: z.string().optional()
})

export type SaveImageInput = z.infer<typeof SaveImageSchema>

// ============================================
// Database Record Schemas
// ============================================

/**
 * Schema for a saved image record from the database
 */
export const SavedImageSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),

  /** Owner's user ID */
  userId: z.string().uuid(),

  /** Storage path in Supabase Storage */
  storagePath: z.string(),

  /** Original generation prompt */
  prompt: z.string().nullable(),

  /** Image aspect ratio */
  aspectRatio: z.string().nullable(),

  /** Image resolution */
  imageSize: z.string().nullable(),

  /** MIME type */
  mimeType: z.string(),

  /** Creation timestamp */
  createdAt: z.string().datetime(),

  /** Signed URL for display (generated at query time) */
  url: z.string().url()
})

export type SavedImage = z.infer<typeof SavedImageSchema>

/**
 * Schema for database row (snake_case)
 */
export const UserImageRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  storage_path: z.string(),
  prompt: z.string().nullable(),
  aspect_ratio: z.string().nullable(),
  image_size: z.string().nullable(),
  mime_type: z.string(),
  created_at: z.string()
})

export type UserImageRow = z.infer<typeof UserImageRowSchema>

// ============================================
// API Response Schemas
// ============================================

/**
 * Schema for paginated images response
 */
export const GetImagesResponseSchema = z.object({
  images: z.array(SavedImageSchema),
  nextPage: z.number().nullable()
})

export type GetImagesResponse = z.infer<typeof GetImagesResponseSchema>

/**
 * Schema for save image success response
 */
export const SaveImageResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url()
})

export type SaveImageResponse = z.infer<typeof SaveImageResponseSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Transform database row (snake_case) to SavedImage (camelCase)
 */
export function transformRowToSavedImage(
  row: UserImageRow,
  url: string
): SavedImage {
  return {
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
    prompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    imageSize: row.image_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    url
  }
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
  }
  return extensions[mimeType] || 'png'
}
