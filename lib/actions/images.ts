'use server'

/**
 * Image Server Actions
 *
 * Server actions for the Your Stuff feature.
 * These are called from client components to save, list, and delete images.
 */

import { revalidatePath } from 'next/cache'

import {
  getExtensionFromMimeType,
  type SavedImage,
  type SaveImageInput,
  transformRowToSavedImage,
  type UserImageRow
} from '@/lib/schema/image'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

// ============================================
// Constants
// ============================================

const IMAGES_PER_PAGE = 20
const SIGNED_URL_EXPIRY = 3600 // 1 hour in seconds
const STORAGE_BUCKET = 'user-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ============================================
// Save Image
// ============================================

export async function saveImage(
  data: SaveImageInput
): Promise<{ id: string; url: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Please sign in to save images' }
    }

    const { imageData, mimeType, prompt, aspectRatio, imageSize } = data

    // Validate MIME type
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validMimeTypes.includes(mimeType)) {
      return { error: 'Invalid image type' }
    }

    // Generate unique filename
    const imageId = crypto.randomUUID()
    const extension = getExtensionFromMimeType(mimeType)
    const storagePath = `${user.id}/${imageId}.${extension}`

    // Decode base64 to buffer
    const buffer = Buffer.from(imageData, 'base64')

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return { error: 'Image exceeds 5MB limit' }
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { error: 'Failed to upload image' }
    }

    // Save metadata to database
    const { data: insertedRow, error: insertError } = await supabase
      .from('user_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        prompt: prompt || null,
        aspect_ratio: aspectRatio || null,
        image_size: imageSize || null,
        mime_type: mimeType
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Attempt to clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return { error: 'Failed to save image metadata' }
    }

    // Generate signed URL for immediate display
    const { data: signedUrlData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    // Revalidate the stuff page
    revalidatePath('/stuff')

    return {
      id: insertedRow.id,
      url: signedUrlData?.signedUrl || ''
    }
  } catch (error) {
    console.error('Error in saveImage:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get User Images
// ============================================

export async function getUserImages(
  page = 1
): Promise<
  { images: SavedImage[]; nextPage: number | null } | { error: string }
> {
  if (!isSupabaseConfigured()) {
    return { error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Please sign in to view your images' }
    }

    const offset = (page - 1) * IMAGES_PER_PAGE

    // Query images with pagination (range is inclusive on both ends)
    const { data: rows, error: queryError } = await supabase
      .from('user_images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + IMAGES_PER_PAGE - 1)

    if (queryError) {
      console.error('Error querying images:', queryError)
      return { error: 'Failed to fetch images' }
    }

    const typedRows = rows as UserImageRow[]

    // Generate signed URLs for each image
    const images = await Promise.all(
      typedRows.map(async row => {
        const { data: signedUrlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRY)

        const url = signedUrlData?.signedUrl || ''
        return transformRowToSavedImage(row, url)
      })
    )

    // Determine if there are more pages
    const nextPage = typedRows.length === IMAGES_PER_PAGE ? page + 1 : null

    return { images, nextPage }
  } catch (error) {
    console.error('Error in getUserImages:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// ============================================
// Delete Image
// ============================================

export async function deleteImage(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Please sign in to delete images' }
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return { error: 'Invalid image ID' }
    }

    // Get the image record to verify ownership and get storage path
    const { data: imageRecord, error: fetchError } = await supabase
      .from('user_images')
      .select('storage_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !imageRecord) {
      return { error: 'Image not found' }
    }

    // Verify ownership
    if (imageRecord.user_id !== user.id) {
      return { error: 'You can only delete your own images' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([imageRecord.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete metadata even if storage delete fails
    }

    // Delete metadata from database
    const { error: deleteError } = await supabase
      .from('user_images')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return { error: 'Failed to delete image' }
    }

    // Revalidate the stuff page
    revalidatePath('/stuff')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return { error: 'An unexpected error occurred' }
  }
}
