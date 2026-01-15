/**
 * Gemini File API Operations
 *
 * Handles file uploads for large videos (> 20MB) using Gemini's File API.
 * Files are processed asynchronously and must be in ACTIVE state before use.
 *
 * @see https://ai.google.dev/gemini-api/docs/files
 * @see https://ai.google.dev/gemini-api/docs/video-understanding#upload-video
 */

import { logger } from '@/lib/utils/logger'

import { getGeminiClient } from './core'

// ============================================
// Types
// ============================================

export type FileState = 'PROCESSING' | 'ACTIVE' | 'FAILED'

export interface UploadedFile {
  name: string
  displayName?: string
  mimeType: string
  sizeBytes: string
  createTime: string
  updateTime: string
  expirationTime?: string
  sha256Hash?: string
  uri: string
  state: FileState
  error?: {
    code: number
    message: string
  }
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

// ============================================
// File API Operations
// ============================================

/**
 * Upload a video file to Gemini File API
 *
 * For videos > 20MB that can't be sent inline.
 * The file is processed asynchronously - use waitForProcessing to wait for ACTIVE state.
 *
 * @param file - The video file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns The uploaded file info including URI
 *
 * @see https://ai.google.dev/gemini-api/docs/files
 */
export async function uploadVideoToFileAPI(
  file: File,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<UploadedFile> {
  const client = getGeminiClient()

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer()

  // Report initial progress
  onProgress?.({ loaded: 0, total: file.size, percentage: 0 })

  try {
    // Upload using the SDK's files.upload method
    const uploadResult = await client.files.upload({
      file: new Blob([arrayBuffer], { type: file.type }),
      config: {
        mimeType: file.type,
        displayName: file.name
      }
    })

    // Report completion
    onProgress?.({ loaded: file.size, total: file.size, percentage: 100 })

    return {
      name: uploadResult.name || '',
      displayName: uploadResult.displayName,
      mimeType: uploadResult.mimeType || file.type,
      sizeBytes: String(uploadResult.sizeBytes || file.size),
      createTime: uploadResult.createTime || new Date().toISOString(),
      updateTime: uploadResult.updateTime || new Date().toISOString(),
      expirationTime: uploadResult.expirationTime,
      uri: uploadResult.uri || '',
      state: (uploadResult.state as FileState) || 'PROCESSING'
    }
  } catch (error) {
    logger.error('Gemini/FileAPI', error, { action: 'upload' })
    throw new Error(
      `Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get the current status of an uploaded file
 *
 * @param fileName - The file name (from upload response)
 * @returns Current file status
 */
export async function getFileStatus(fileName: string): Promise<UploadedFile> {
  const client = getGeminiClient()

  try {
    const file = await client.files.get({ name: fileName })

    return {
      name: file.name || fileName,
      displayName: file.displayName,
      mimeType: file.mimeType || '',
      sizeBytes: String(file.sizeBytes || 0),
      createTime: file.createTime || '',
      updateTime: file.updateTime || '',
      expirationTime: file.expirationTime,
      uri: file.uri || '',
      state: (file.state as FileState) || 'PROCESSING',
      error: file.error as UploadedFile['error']
    }
  } catch (error) {
    logger.error('Gemini/FileAPI', error, { action: 'getStatus' })
    throw new Error(
      `Failed to get file status: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Wait for a file to finish processing
 *
 * Videos need to be processed by Gemini before they can be used.
 * This function polls the file status until it reaches ACTIVE or FAILED state.
 *
 * @param fileName - The file name to wait for
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param pollIntervalMs - Polling interval in milliseconds (default: 2 seconds)
 * @returns The processed file info
 * @throws Error if file processing fails or times out
 */
export async function waitForProcessing(
  fileName: string,
  maxWaitMs = 5 * 60 * 1000, // 5 minutes
  pollIntervalMs = 2000 // 2 seconds
): Promise<UploadedFile> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const file = await getFileStatus(fileName)

    if (file.state === 'ACTIVE') {
      return file
    }

    if (file.state === 'FAILED') {
      throw new Error(
        `File processing failed: ${file.error?.message || 'Unknown error'}`
      )
    }

    // Still processing, wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('File processing timed out')
}

/**
 * Upload a video and wait for it to be ready
 *
 * Convenience function that combines upload and wait operations.
 *
 * @param file - The video file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns The ready-to-use file info
 */
export async function uploadAndWaitForVideo(
  file: File,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<UploadedFile> {
  // Upload the file
  const uploadedFile = await uploadVideoToFileAPI(file, onProgress)

  // Wait for processing to complete
  const processedFile = await waitForProcessing(uploadedFile.name)

  return processedFile
}

/**
 * Delete an uploaded file
 *
 * Files are automatically deleted after 48 hours, but you can delete earlier.
 *
 * @param fileName - The file name to delete
 */
export async function deleteFile(fileName: string): Promise<void> {
  const client = getGeminiClient()

  try {
    await client.files.delete({ name: fileName })
  } catch (error) {
    logger.error('Gemini/FileAPI', error, { action: 'delete' })
    // Don't throw - deletion is best-effort
  }
}
