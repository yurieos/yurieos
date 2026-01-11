/**
 * Your Stuff Images API
 *
 * Handles listing and creating saved images for authenticated users.
 * Images are stored in Supabase Storage with metadata in the database.
 */

import {
  getExtensionFromMimeType,
  SaveImageSchema,
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

// ============================================
// GET - List user's images
// ============================================

export async function GET(req: Request) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: 'Storage is not configured' },
      { status: 503 }
    )
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse pagination params
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
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
      return Response.json({ error: 'Failed to fetch images' }, { status: 500 })
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

    return Response.json({ images, nextPage })
  } catch (error) {
    console.error('Error in GET /api/stuff/images:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Save a new image
// ============================================

export async function POST(req: Request) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: 'Storage is not configured' },
      { status: 503 }
    )
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validation = SaveImageSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ')
      return Response.json({ error: errors }, { status: 400 })
    }

    const { imageData, mimeType, prompt, aspectRatio, imageSize } =
      validation.data

    // Generate unique filename
    const imageId = crypto.randomUUID()
    const extension = getExtensionFromMimeType(mimeType)
    const storagePath = `${user.id}/${imageId}.${extension}`

    // Decode base64 to buffer
    const buffer = Buffer.from(imageData, 'base64')

    // Check file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024
    if (buffer.length > MAX_SIZE) {
      return Response.json(
        { error: 'Image exceeds 5MB limit' },
        { status: 400 }
      )
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
      return Response.json({ error: 'Failed to upload image' }, { status: 500 })
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
      return Response.json(
        { error: 'Failed to save image metadata' },
        { status: 500 }
      )
    }

    // Generate signed URL for immediate display
    const { data: signedUrlData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    return Response.json({
      id: insertedRow.id,
      url: signedUrlData?.signedUrl || ''
    })
  } catch (error) {
    console.error('Error in POST /api/stuff/images:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
