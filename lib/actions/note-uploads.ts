'use server'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

// ============================================
// Constants
// ============================================

const BUCKET_NAME = 'note-attachments'

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Allowed file types
const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv'
]

const ALLOWED_TYPES = [
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...AUDIO_TYPES,
  ...DOCUMENT_TYPES
]

// ============================================
// Types
// ============================================

interface UploadResult {
  url: string | null
  error?: string
}

interface DeleteResult {
  success: boolean
  error?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique file path for storage
 */
function generateFilePath(
  userId: string,
  noteId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${userId}/${noteId}/${timestamp}-${randomSuffix}-${sanitizedName}`
}

/**
 * Get file type category
 */
function getFileCategory(
  mimeType: string
): 'image' | 'video' | 'audio' | 'file' {
  if (IMAGE_TYPES.includes(mimeType)) return 'image'
  if (VIDEO_TYPES.includes(mimeType)) return 'video'
  if (AUDIO_TYPES.includes(mimeType)) return 'audio'
  return 'file'
}

/**
 * Validate file size based on type
 */
function validateFileSize(file: File): { valid: boolean; error?: string } {
  const category = getFileCategory(file.type)
  const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit for ${category} files`
    }
  }

  return { valid: true }
}

// ============================================
// Upload Functions
// ============================================

/**
 * Upload a file to Supabase Storage for use in BlockNote editor
 * This function is designed to work with BlockNote's uploadFile prop
 */
export async function uploadNoteFile(
  noteId: string,
  formData: FormData
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: 'Storage is not configured' }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return { url: null, error: 'Authentication required' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { url: null, error: 'No file provided' }
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        url: null,
        error: `File type ${file.type} is not supported`
      }
    }

    // Validate file size
    const sizeValidation = validateFileSize(file)
    if (!sizeValidation.valid) {
      return { url: null, error: sizeValidation.error }
    }

    const supabase = await createClient()

    // Generate file path
    const filePath = generateFilePath(userId, noteId, file.name)

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return { url: null, error: uploadError.message }
    }

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    return { url: publicUrl }
  } catch (error) {
    console.error('Error in uploadNoteFile:', error)
    return { url: null, error: 'Failed to upload file' }
  }
}

/**
 * Client-side upload function for BlockNote
 * Returns a URL string as expected by BlockNote's uploadFile prop
 */
export async function uploadFileForBlockNote(
  noteId: string,
  file: File
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const result = await uploadNoteFile(noteId, formData)

  if (result.error || !result.url) {
    throw new Error(result.error || 'Failed to upload file')
  }

  return result.url
}

// ============================================
// Delete Functions
// ============================================

/**
 * Delete a file from Supabase Storage
 */
export async function deleteNoteFile(filePath: string): Promise<DeleteResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()

    // Extract path from URL if full URL provided
    let storagePath = filePath
    if (filePath.includes(BUCKET_NAME)) {
      const pathMatch = filePath.match(new RegExp(`${BUCKET_NAME}/(.+)`))
      if (pathMatch) {
        storagePath = pathMatch[1]
      }
    }

    // Verify user owns this file (path should start with userId)
    if (!storagePath.startsWith(userId)) {
      return { success: false, error: 'Access denied' }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath])

    if (error) {
      console.error('Error deleting file:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteNoteFile:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

/**
 * Delete all files associated with a note
 */
export async function deleteNoteFiles(noteId: string): Promise<DeleteResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Storage is not configured' }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()

    // List all files for this note
    const folderPath = `${userId}/${noteId}`
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath)

    if (listError) {
      console.error('Error listing files:', listError)
      return { success: false, error: listError.message }
    }

    if (!files || files.length === 0) {
      return { success: true }
    }

    // Delete all files
    const filePaths = files.map(file => `${folderPath}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths)

    if (deleteError) {
      console.error('Error deleting files:', deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteNoteFiles:', error)
    return { success: false, error: 'Failed to delete files' }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get signed URL for private file access (if using private bucket)
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: 'Storage is not configured' }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return { url: null, error: 'Authentication required' }
    }

    const supabase = await createClient()

    // Extract storage path if full URL provided
    let storagePath = filePath
    if (filePath.includes(BUCKET_NAME)) {
      const pathMatch = filePath.match(new RegExp(`${BUCKET_NAME}/(.+)`))
      if (pathMatch) {
        storagePath = pathMatch[1]
      }
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl }
  } catch (error) {
    console.error('Error in getSignedUrl:', error)
    return { url: null, error: 'Failed to get signed URL' }
  }
}
