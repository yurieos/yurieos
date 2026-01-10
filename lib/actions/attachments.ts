'use server'

/**
 * Attachment Server Actions
 *
 * Server actions for uploading, fetching, and deleting chat attachments.
 * Files are stored in Supabase Storage with metadata in the user_attachments table.
 */

import {
  AttachmentRef,
  AttachmentRow,
  FILE_SIZE_LIMITS,
  generateStoragePath,
  getAttachmentTypeFromMime,
  isSupportedMimeType,
  SavedAttachment,
  SIGNED_URL_EXPIRY,
  STORAGE_BUCKET,
  toAttachmentRef,
  transformRowToSavedAttachment
} from '@/lib/schema/attachment'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

// ============================================
// Upload Attachment
// ============================================

export interface UploadAttachmentParams {
  /** Base64 encoded file data (without data URL prefix) */
  data: string
  /** MIME type of the file */
  mimeType: string
  /** Chat ID this attachment belongs to */
  chatId: string
  /** Message ID this attachment belongs to */
  messageId: string
  /** Original filename (optional) */
  filename?: string
}

export interface UploadAttachmentResult {
  success: true
  attachment: AttachmentRef
}

export interface UploadAttachmentError {
  success: false
  error: string
}

/**
 * Upload an attachment to Supabase Storage
 * Returns an AttachmentRef for storing in the chat message
 */
export async function uploadAttachment(
  params: UploadAttachmentParams
): Promise<UploadAttachmentResult | UploadAttachmentError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Please sign in to upload attachments' }
    }

    const { data, mimeType, chatId, messageId, filename } = params

    // Validate MIME type
    if (!isSupportedMimeType(mimeType)) {
      return { success: false, error: 'Unsupported file type' }
    }

    const attachmentType = getAttachmentTypeFromMime(mimeType)
    if (!attachmentType) {
      return { success: false, error: 'Could not determine attachment type' }
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(data, 'base64')
    const fileSize = buffer.length

    // Validate file size
    const maxSize = FILE_SIZE_LIMITS[attachmentType]
    if (fileSize > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      return {
        success: false,
        error: `File exceeds ${maxMB}MB limit for ${attachmentType}s`
      }
    }

    // Generate unique ID and storage path
    const attachmentId = crypto.randomUUID()
    const storagePath = generateStoragePath(
      user.id,
      chatId,
      attachmentId,
      mimeType
    )

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { success: false, error: 'Failed to upload attachment' }
    }

    // Save metadata to database
    const { error: insertError } = await supabase
      .from('user_attachments')
      .insert({
        id: attachmentId,
        user_id: user.id,
        chat_id: chatId,
        message_id: messageId,
        storage_path: storagePath,
        filename: filename || null,
        mime_type: mimeType,
        file_size: fileSize,
        attachment_type: attachmentType
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      // Attempt to clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return { success: false, error: 'Failed to save attachment metadata' }
    }

    // Return attachment reference
    const attachmentRef: AttachmentRef = {
      id: attachmentId,
      type: attachmentType,
      mimeType,
      filename: filename || null
    }

    return { success: true, attachment: attachmentRef }
  } catch (error) {
    console.error('Error in uploadAttachment:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get Attachment URL
// ============================================

export interface GetAttachmentUrlResult {
  success: true
  url: string
}

export interface GetAttachmentUrlError {
  success: false
  error: string
}

/**
 * Get a signed URL for an attachment
 * URLs expire after 1 hour
 */
export async function getAttachmentUrl(
  attachmentId: string
): Promise<GetAttachmentUrlResult | GetAttachmentUrlError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Please sign in to view attachments' }
    }

    // Get attachment metadata (RLS will ensure user owns it)
    const { data: attachment, error: fetchError } = await supabase
      .from('user_attachments')
      .select('storage_path, user_id')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found' }
    }

    // Generate signed URL
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(attachment.storage_path, SIGNED_URL_EXPIRY)

    if (signError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signError)
      return { success: false, error: 'Failed to generate access URL' }
    }

    return { success: true, url: signedUrlData.signedUrl }
  } catch (error) {
    console.error('Error in getAttachmentUrl:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get Multiple Attachment URLs
// ============================================

export interface GetAttachmentUrlsResult {
  success: true
  urls: Record<string, string>
}

export interface GetAttachmentUrlsError {
  success: false
  error: string
}

/**
 * Get signed URLs for multiple attachments
 * Returns a map of attachment ID to URL
 */
export async function getAttachmentUrls(
  attachmentIds: string[]
): Promise<GetAttachmentUrlsResult | GetAttachmentUrlsError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  if (attachmentIds.length === 0) {
    return { success: true, urls: {} }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Please sign in to view attachments' }
    }

    // Get attachment metadata (RLS will ensure user owns them)
    const { data: attachments, error: fetchError } = await supabase
      .from('user_attachments')
      .select('id, storage_path')
      .in('id', attachmentIds)

    if (fetchError) {
      console.error('Fetch attachments error:', fetchError)
      return { success: false, error: 'Failed to fetch attachments' }
    }

    if (!attachments || attachments.length === 0) {
      return { success: true, urls: {} }
    }

    // Generate signed URLs for all attachments
    const urls: Record<string, string> = {}

    await Promise.all(
      attachments.map(async attachment => {
        const { data: signedUrlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(attachment.storage_path, SIGNED_URL_EXPIRY)

        if (signedUrlData?.signedUrl) {
          urls[attachment.id] = signedUrlData.signedUrl
        }
      })
    )

    return { success: true, urls }
  } catch (error) {
    console.error('Error in getAttachmentUrls:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// Delete Attachments by Chat
// ============================================

export interface DeleteAttachmentsByChatResult {
  success: true
  deletedCount: number
}

export interface DeleteAttachmentsByChatError {
  success: false
  error: string
}

/**
 * Delete all attachments for a chat
 * Called when a chat is deleted
 */
export async function deleteAttachmentsByChat(
  chatId: string,
  userId: string
): Promise<DeleteAttachmentsByChatResult | DeleteAttachmentsByChatError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Get all attachments for this chat and user
    const { data: attachments, error: fetchError } = await supabase
      .from('user_attachments')
      .select('id, storage_path')
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (fetchError) {
      console.error('Fetch attachments error:', fetchError)
      return { success: false, error: 'Failed to fetch attachments' }
    }

    if (!attachments || attachments.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete files from storage
    const storagePaths = attachments.map(a => a.storage_path)
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths)

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete metadata even if storage delete fails
    }

    // Delete metadata from database
    const attachmentIds = attachments.map(a => a.id)
    const { error: deleteError } = await supabase
      .from('user_attachments')
      .delete()
      .in('id', attachmentIds)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return { success: false, error: 'Failed to delete attachment metadata' }
    }

    return { success: true, deletedCount: attachments.length }
  } catch (error) {
    console.error('Error in deleteAttachmentsByChat:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get Full Attachment Data (for Gemini API)
// ============================================

export interface GetAttachmentDataResult {
  success: true
  data: string // base64 encoded
  mimeType: string
}

export interface GetAttachmentDataError {
  success: false
  error: string
}

/**
 * Get the full attachment data as base64
 * Used to send stored attachments to Gemini API
 */
export async function getAttachmentData(
  attachmentId: string
): Promise<GetAttachmentDataResult | GetAttachmentDataError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Please sign in to access attachments' }
    }

    // Get attachment metadata (RLS will ensure user owns it)
    const { data: attachment, error: fetchError } = await supabase
      .from('user_attachments')
      .select('storage_path, mime_type')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found' }
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(attachment.storage_path)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return { success: false, error: 'Failed to download attachment' }
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return {
      success: true,
      data: base64,
      mimeType: attachment.mime_type
    }
  } catch (error) {
    console.error('Error in getAttachmentData:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ============================================
// Get Attachments for Message
// ============================================

export interface GetMessageAttachmentsResult {
  success: true
  attachments: SavedAttachment[]
}

export interface GetMessageAttachmentsError {
  success: false
  error: string
}

/**
 * Get all attachments for a specific message with signed URLs
 */
export async function getMessageAttachments(
  messageId: string
): Promise<GetMessageAttachmentsResult | GetMessageAttachmentsError> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Please sign in to view attachments' }
    }

    // Get attachments for this message (RLS will ensure user owns them)
    const { data: rows, error: fetchError } = await supabase
      .from('user_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Fetch attachments error:', fetchError)
      return { success: false, error: 'Failed to fetch attachments' }
    }

    if (!rows || rows.length === 0) {
      return { success: true, attachments: [] }
    }

    const typedRows = rows as AttachmentRow[]

    // Generate signed URLs for each attachment
    const attachments = await Promise.all(
      typedRows.map(async row => {
        const { data: signedUrlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRY)

        const url = signedUrlData?.signedUrl || ''
        return transformRowToSavedAttachment(row, url)
      })
    )

    return { success: true, attachments }
  } catch (error) {
    console.error('Error in getMessageAttachments:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
