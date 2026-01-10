/**
 * Your Stuff Images API - Single Image Operations
 *
 * Handles deletion of individual saved images.
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

// ============================================
// Constants
// ============================================

const STORAGE_BUCKET = 'user-images'

// ============================================
// DELETE - Remove an image
// ============================================

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: 'Storage is not configured' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return Response.json({ error: 'Invalid image ID' }, { status: 400 })
    }

    // Get the image record to verify ownership and get storage path
    const { data: imageRecord, error: fetchError } = await supabase
      .from('user_images')
      .select('storage_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !imageRecord) {
      return Response.json({ error: 'Image not found' }, { status: 404 })
    }

    // Verify ownership (RLS should handle this, but double-check)
    if (imageRecord.user_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
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
      return Response.json({ error: 'Failed to delete image' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/stuff/images/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
