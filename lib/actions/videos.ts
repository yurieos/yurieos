'use server'

/**
 * Video Server Actions
 *
 * Server actions for video storage feature.
 * These are called from client components to save, list, and delete videos.
 */

import { revalidatePath } from 'next/cache'

import {
  getVideoExtensionFromMimeType,
  type SavedVideo,
  type SaveVideoInput,
  transformRowToSavedVideo,
  type UserVideoRow
} from '@/lib/schema/video'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

// ============================================
// Constants
// ============================================

const VIDEOS_PER_PAGE = 12
const SIGNED_URL_EXPIRY = 3600 // 1 hour in seconds
const STORAGE_BUCKET = 'user-videos'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// ============================================
// Save Video
// ============================================

export async function saveVideo(
  data: SaveVideoInput
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
      return { error: 'Please sign in to save videos' }
    }

    const {
      videoData,
      mimeType,
      prompt,
      aspectRatio,
      resolution,
      durationSeconds
    } = data

    // Validate MIME type
    const validMimeTypes = ['video/mp4', 'video/webm']
    if (!validMimeTypes.includes(mimeType)) {
      return { error: 'Invalid video type' }
    }

    // Generate unique filename
    const videoId = crypto.randomUUID()
    const extension = getVideoExtensionFromMimeType(mimeType)
    const storagePath = `${user.id}/${videoId}.${extension}`

    // Decode base64 to buffer
    const buffer = Buffer.from(videoData, 'base64')

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return { error: 'Video exceeds 50MB limit' }
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
      return { error: 'Failed to upload video' }
    }

    // Save metadata to database
    const { data: insertedRow, error: insertError } = await supabase
      .from('user_videos')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        prompt: prompt || null,
        aspect_ratio: aspectRatio || null,
        resolution: resolution || null,
        duration_seconds: durationSeconds || null,
        mime_type: mimeType,
        file_size: buffer.length
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Attempt to clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return { error: 'Failed to save video metadata' }
    }

    // Generate signed URL for immediate playback
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
    console.error('Error in saveVideo:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get User Videos
// ============================================

export async function getUserVideos(
  page = 1
): Promise<
  { videos: SavedVideo[]; nextPage: number | null } | { error: string }
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
      return { error: 'Please sign in to view your videos' }
    }

    const offset = (page - 1) * VIDEOS_PER_PAGE

    // Query videos with pagination (range is inclusive on both ends)
    const { data: rows, error: queryError } = await supabase
      .from('user_videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + VIDEOS_PER_PAGE - 1)

    if (queryError) {
      console.error('Error querying videos:', queryError)
      return { error: 'Failed to fetch videos' }
    }

    const typedRows = rows as UserVideoRow[]

    // Generate signed URLs for each video
    const videos = await Promise.all(
      typedRows.map(async row => {
        const { data: signedUrlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRY)

        const url = signedUrlData?.signedUrl || ''
        return transformRowToSavedVideo(row, url)
      })
    )

    // Determine if there are more pages
    const nextPage = typedRows.length === VIDEOS_PER_PAGE ? page + 1 : null

    return { videos, nextPage }
  } catch (error) {
    console.error('Error in getUserVideos:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// ============================================
// Delete Video
// ============================================

export async function deleteVideo(
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
      return { error: 'Please sign in to delete videos' }
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return { error: 'Invalid video ID' }
    }

    // Get the video record to verify ownership and get storage path
    const { data: videoRecord, error: fetchError } = await supabase
      .from('user_videos')
      .select('storage_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !videoRecord) {
      return { error: 'Video not found' }
    }

    // Verify ownership
    if (videoRecord.user_id !== user.id) {
      return { error: 'You can only delete your own videos' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([videoRecord.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete metadata even if storage delete fails
    }

    // Delete metadata from database
    const { error: deleteError } = await supabase
      .from('user_videos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return { error: 'Failed to delete video' }
    }

    // Revalidate the stuff page
    revalidatePath('/stuff')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteVideo:', error)
    return { error: 'An unexpected error occurred' }
  }
}
