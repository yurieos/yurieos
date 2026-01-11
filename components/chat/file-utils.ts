import {
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SupportedAudioType,
  SupportedDocumentType,
  SupportedImageType,
  SupportedVideoType
} from '@/lib/types'

/**
 * All supported file types for the unified file input
 */
export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_AUDIO_TYPES
]

/**
 * Convert a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate if a file is a supported image type
 */
export function isValidImageType(
  file: File
): file is File & { type: SupportedImageType } {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)
}

/**
 * Validate if a file is a supported video type
 */
export function isValidVideoType(
  file: File
): file is File & { type: SupportedVideoType } {
  return SUPPORTED_VIDEO_TYPES.includes(file.type as SupportedVideoType)
}

/**
 * Validate if a file is a supported document type
 */
export function isValidDocumentType(
  file: File
): file is File & { type: SupportedDocumentType } {
  return SUPPORTED_DOCUMENT_TYPES.includes(file.type as SupportedDocumentType)
}

/**
 * Validate if a file is a supported audio type
 */
export function isValidAudioType(
  file: File
): file is File & { type: SupportedAudioType } {
  return SUPPORTED_AUDIO_TYPES.includes(file.type as SupportedAudioType)
}

/**
 * Generate a unique ID for attachments
 */
export function generateAttachmentId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
