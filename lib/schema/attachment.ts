/**
 * Attachment Schema
 *
 * Zod validation schemas for user chat attachment storage.
 * @see /supabase/migrations/004_user_attachments.sql
 */

import { z } from 'zod'

import {
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES
} from '@/lib/types'

// ============================================
// Constants
// ============================================

/** Attachment type categories */
export const ATTACHMENT_TYPES = [
  'image',
  'video',
  'document',
  'audio'
] as const

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]

/** File size limits in bytes */
export const FILE_SIZE_LIMITS = {
  image: 20 * 1024 * 1024, // 20MB
  video: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  audio: 50 * 1024 * 1024 // 50MB
} as const

/** Signed URL expiry in seconds */
export const SIGNED_URL_EXPIRY = 3600 // 1 hour

/** Storage bucket name */
export const STORAGE_BUCKET = 'user-attachments'

// ============================================
// Helper Functions
// ============================================

/**
 * Get attachment type from MIME type
 */
export function getAttachmentTypeFromMime(mimeType: string): AttachmentType | null {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return 'image'
  }
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType as (typeof SUPPORTED_VIDEO_TYPES)[number])) {
    return 'video'
  }
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType as (typeof SUPPORTED_DOCUMENT_TYPES)[number])) {
    return 'document'
  }
  if (SUPPORTED_AUDIO_TYPES.includes(mimeType as (typeof SUPPORTED_AUDIO_TYPES)[number])) {
    return 'audio'
  }
  return null
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    // Images
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    // Videos
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/mov': 'mov',
    'video/avi': 'avi',
    'video/x-flv': 'flv',
    'video/mpg': 'mpg',
    'video/webm': 'webm',
    'video/wmv': 'wmv',
    'video/3gpp': '3gp',
    // Documents
    'application/pdf': 'pdf',
    // Audio
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/aiff': 'aiff',
    'audio/x-aiff': 'aiff',
    'audio/aac': 'aac',
    'audio/x-aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac'
  }
  return extensions[mimeType] || 'bin'
}

/**
 * Check if MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return getAttachmentTypeFromMime(mimeType) !== null
}

/**
 * Validate file size against limit for attachment type
 */
export function isFileSizeValid(size: number, attachmentType: AttachmentType): boolean {
  return size <= FILE_SIZE_LIMITS[attachmentType]
}

// ============================================
// All supported MIME types combined
// ============================================

export const ALL_SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_AUDIO_TYPES
] as const

// ============================================
// Input Schemas
// ============================================

/**
 * Schema for uploading an attachment
 */
export const UploadAttachmentSchema = z.object({
  /** Chat ID this attachment belongs to */
  chatId: z.string().min(1, 'Chat ID is required'),

  /** Message ID this attachment belongs to */
  messageId: z.string().min(1, 'Message ID is required'),

  /** Original filename */
  filename: z.string().optional(),

  /** MIME type of the file */
  mimeType: z.string().refine(isSupportedMimeType, {
    message: 'Unsupported file type'
  }),

  /** File size in bytes */
  fileSize: z.number().positive('File size must be positive')
})

export type UploadAttachmentInput = z.infer<typeof UploadAttachmentSchema>

// ============================================
// Database Record Schemas
// ============================================

/**
 * Schema for database row (snake_case)
 */
export const AttachmentRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  chat_id: z.string(),
  message_id: z.string(),
  storage_path: z.string(),
  filename: z.string().nullable(),
  mime_type: z.string(),
  file_size: z.number(),
  attachment_type: z.enum(ATTACHMENT_TYPES),
  created_at: z.string()
})

export type AttachmentRow = z.infer<typeof AttachmentRowSchema>

/**
 * Schema for a saved attachment (camelCase, with URL)
 */
export const SavedAttachmentSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),

  /** Owner's user ID */
  userId: z.string().uuid(),

  /** Chat ID this attachment belongs to */
  chatId: z.string(),

  /** Message ID this attachment belongs to */
  messageId: z.string(),

  /** Storage path in Supabase Storage */
  storagePath: z.string(),

  /** Original filename */
  filename: z.string().nullable(),

  /** MIME type */
  mimeType: z.string(),

  /** File size in bytes */
  fileSize: z.number(),

  /** Attachment type category */
  attachmentType: z.enum(ATTACHMENT_TYPES),

  /** Creation timestamp */
  createdAt: z.string().datetime(),

  /** Signed URL for access (generated at query time) */
  url: z.string().url()
})

export type SavedAttachment = z.infer<typeof SavedAttachmentSchema>

/**
 * Attachment reference stored in chat messages
 * Contains only the ID - URL is resolved on demand
 */
export const AttachmentRefSchema = z.object({
  /** Attachment ID in database */
  id: z.string().uuid(),

  /** Attachment type for rendering */
  type: z.enum(ATTACHMENT_TYPES),

  /** MIME type for rendering */
  mimeType: z.string(),

  /** Original filename for display */
  filename: z.string().nullable()
})

export type AttachmentRef = z.infer<typeof AttachmentRefSchema>

// ============================================
// Transform Functions
// ============================================

/**
 * Transform database row (snake_case) to SavedAttachment (camelCase)
 */
export function transformRowToSavedAttachment(
  row: AttachmentRow,
  url: string
): SavedAttachment {
  return {
    id: row.id,
    userId: row.user_id,
    chatId: row.chat_id,
    messageId: row.message_id,
    storagePath: row.storage_path,
    filename: row.filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    attachmentType: row.attachment_type,
    createdAt: row.created_at,
    url
  }
}

/**
 * Create an AttachmentRef from a SavedAttachment or AttachmentRow
 */
export function toAttachmentRef(
  attachment: SavedAttachment | AttachmentRow
): AttachmentRef {
  const isRow = 'user_id' in attachment
  return {
    id: attachment.id,
    type: isRow
      ? (attachment as AttachmentRow).attachment_type
      : (attachment as SavedAttachment).attachmentType,
    mimeType: isRow
      ? (attachment as AttachmentRow).mime_type
      : (attachment as SavedAttachment).mimeType,
    filename: isRow
      ? (attachment as AttachmentRow).filename
      : (attachment as SavedAttachment).filename
  }
}

/**
 * Generate storage path for an attachment
 * Format: {userId}/{chatId}/{attachmentId}.{ext}
 */
export function generateStoragePath(
  userId: string,
  chatId: string,
  attachmentId: string,
  mimeType: string
): string {
  const extension = getExtensionFromMimeType(mimeType)
  return `${userId}/${chatId}/${attachmentId}.${extension}`
}
