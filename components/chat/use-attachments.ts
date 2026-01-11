'use client'

import { useCallback, useMemo, useState } from 'react'

import { toast } from 'sonner'

import { uploadAttachment } from '@/lib/actions/attachments'
import {
  AudioAttachment,
  AudioPart,
  DocumentAttachment,
  DocumentPart,
  ImageAttachment,
  ImagePart,
  MAX_AUDIO_FILE_SIZE_MB,
  MAX_DOCUMENT_FILE_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGES_PER_MESSAGE,
  MAX_VIDEO_FILE_SIZE_MB,
  SupportedAudioType,
  SupportedDocumentType,
  SupportedImageType,
  SupportedVideoType,
  VideoAttachment,
  VideoPart
} from '@/lib/types'

import {
  fileToBase64,
  generateAttachmentId,
  isValidAudioType,
  isValidDocumentType,
  isValidImageType,
  isValidVideoType
} from './file-utils'

interface UseAttachmentsOptions {
  isAuthenticated: boolean
}

interface UseAttachmentsReturn {
  // State
  attachments: ImageAttachment[]
  videoAttachment: VideoAttachment | null
  documentAttachment: DocumentAttachment | null
  audioAttachment: AudioAttachment | null
  hasAttachments: boolean

  // Actions
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  removeAttachment: (id: string) => void
  removeVideoAttachment: () => void
  removeDocumentAttachment: () => void
  removeAudioAttachment: () => void
  clearAttachments: () => void

  // Conversion for submission
  getImageParts: (chatId: string, messageId: string) => Promise<ImagePart[]>
  getVideoParts: (chatId: string, messageId: string) => Promise<VideoPart[]>
  getDocumentParts: (
    chatId: string,
    messageId: string
  ) => Promise<DocumentPart[]>
  getAudioParts: (chatId: string, messageId: string) => Promise<AudioPart[]>
}

/**
 * Hook for managing chat attachments (images, videos, documents, audio)
 * Handles file validation, state management, and conversion to API parts
 */
export function useAttachments({
  isAuthenticated
}: UseAttachmentsOptions): UseAttachmentsReturn {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [videoAttachment, setVideoAttachment] =
    useState<VideoAttachment | null>(null)
  const [documentAttachment, setDocumentAttachment] =
    useState<DocumentAttachment | null>(null)
  const [audioAttachment, setAudioAttachment] =
    useState<AudioAttachment | null>(null)

  // Track if any attachments exist
  const hasAttachments = useMemo(
    () =>
      attachments.length > 0 ||
      !!videoAttachment ||
      !!documentAttachment ||
      !!audioAttachment,
    [attachments.length, videoAttachment, documentAttachment, audioAttachment]
  )

  // Unified file selection handler - routes files to appropriate attachment type
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      for (const file of Array.from(files)) {
        const sizeMB = file.size / (1024 * 1024)

        // Route to appropriate handler based on MIME type
        if (isValidImageType(file)) {
          // Handle image
          if (attachments.length >= MAX_IMAGES_PER_MESSAGE) {
            toast.error(`Maximum ${MAX_IMAGES_PER_MESSAGE} images allowed`)
            continue
          }
          if (sizeMB > MAX_IMAGE_SIZE_MB) {
            toast.error(
              `${file.name}: Image too large. Maximum ${MAX_IMAGE_SIZE_MB}MB.`
            )
            continue
          }
          const attachment: ImageAttachment = {
            id: generateAttachmentId('img'),
            file,
            previewUrl: URL.createObjectURL(file),
            mimeType: file.type as SupportedImageType
          }
          setAttachments(prev => [...prev, attachment])
        } else if (isValidVideoType(file)) {
          // Handle video (only 1 allowed)
          if (videoAttachment) {
            toast.error('Only one video per message allowed')
            continue
          }
          if (sizeMB > MAX_VIDEO_FILE_SIZE_MB) {
            toast.error(
              `${file.name}: Video too large. Maximum ${MAX_VIDEO_FILE_SIZE_MB}MB.`
            )
            continue
          }
          const attachment: VideoAttachment = {
            id: generateAttachmentId('vid'),
            file,
            previewUrl: URL.createObjectURL(file),
            mimeType: file.type as SupportedVideoType
          }
          setVideoAttachment(attachment)
        } else if (isValidDocumentType(file)) {
          // Handle document (only 1 allowed)
          if (documentAttachment) {
            toast.error('Only one document per message allowed')
            continue
          }
          if (sizeMB > MAX_DOCUMENT_FILE_SIZE_MB) {
            toast.error(
              `${file.name}: Document too large. Maximum ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`
            )
            continue
          }
          const attachment: DocumentAttachment = {
            id: generateAttachmentId('doc'),
            file,
            filename: file.name,
            mimeType: file.type as SupportedDocumentType
          }
          setDocumentAttachment(attachment)
        } else if (isValidAudioType(file)) {
          // Handle audio (only 1 allowed)
          if (audioAttachment) {
            toast.error('Only one audio file per message allowed')
            continue
          }
          if (sizeMB > MAX_AUDIO_FILE_SIZE_MB) {
            toast.error(
              `${file.name}: Audio too large. Maximum ${MAX_AUDIO_FILE_SIZE_MB}MB.`
            )
            continue
          }
          const attachment: AudioAttachment = {
            id: generateAttachmentId('aud'),
            file,
            filename: file.name,
            mimeType: file.type as SupportedAudioType
          }
          setAudioAttachment(attachment)
        } else {
          toast.error(
            `${file.name}: Unsupported file type. Use images, videos, PDFs, or audio files.`
          )
        }
      }

      // Reset file input
      e.target.value = ''
    },
    [attachments.length, videoAttachment, documentAttachment, audioAttachment]
  )

  // Remove image attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id)
      if (attachment) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
      return prev.filter(a => a.id !== id)
    })
  }, [])

  // Remove video attachment
  const removeVideoAttachment = useCallback(() => {
    if (videoAttachment?.previewUrl) {
      URL.revokeObjectURL(videoAttachment.previewUrl)
    }
    setVideoAttachment(null)
  }, [videoAttachment])

  // Remove document attachment
  const removeDocumentAttachment = useCallback(() => {
    setDocumentAttachment(null)
  }, [])

  // Remove audio attachment
  const removeAudioAttachment = useCallback(() => {
    setAudioAttachment(null)
  }, [])

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    attachments.forEach(a => URL.revokeObjectURL(a.previewUrl))
    setAttachments([])
    if (videoAttachment?.previewUrl) {
      URL.revokeObjectURL(videoAttachment.previewUrl)
    }
    setVideoAttachment(null)
    setDocumentAttachment(null)
    setAudioAttachment(null)
  }, [attachments, videoAttachment])

  // Convert attachments to ImageParts for submission
  const getImageParts = useCallback(
    async (chatId: string, messageId: string): Promise<ImagePart[]> => {
      const parts: ImagePart[] = []
      for (const attachment of attachments) {
        const base64 = await fileToBase64(attachment.file)

        // Try to upload to storage if authenticated
        let attachmentId: string | undefined
        if (isAuthenticated) {
          const result = await uploadAttachment({
            data: base64,
            mimeType: attachment.mimeType,
            chatId,
            messageId,
            filename: attachment.file.name
          })
          if (result.success) {
            attachmentId = result.attachment.id
          }
        }

        parts.push({
          type: 'image',
          mimeType: attachment.mimeType,
          data: base64,
          attachmentId,
          filename: attachment.file.name
        })
      }
      return parts
    },
    [attachments, isAuthenticated]
  )

  // Convert video attachment to VideoPart for submission
  const getVideoParts = useCallback(
    async (chatId: string, messageId: string): Promise<VideoPart[]> => {
      if (!videoAttachment) return []

      // YouTube URL - use fileUri (no storage needed)
      if (videoAttachment.youtubeUrl) {
        return [{ type: 'video', fileUri: videoAttachment.youtubeUrl }]
      }

      // Local file
      if (videoAttachment.file) {
        const base64 = await fileToBase64(videoAttachment.file)

        // Try to upload to storage if authenticated
        let attachmentId: string | undefined
        if (isAuthenticated) {
          const result = await uploadAttachment({
            data: base64,
            mimeType: videoAttachment.mimeType!,
            chatId,
            messageId,
            filename: videoAttachment.file.name
          })
          if (result.success) {
            attachmentId = result.attachment.id
          }
        }

        return [
          {
            type: 'video',
            mimeType: videoAttachment.mimeType,
            data: base64,
            attachmentId,
            filename: videoAttachment.file.name
          }
        ]
      }

      return []
    },
    [videoAttachment, isAuthenticated]
  )

  // Convert document attachment to DocumentPart for submission
  const getDocumentParts = useCallback(
    async (chatId: string, messageId: string): Promise<DocumentPart[]> => {
      if (!documentAttachment || !documentAttachment.file) return []

      const base64 = await fileToBase64(documentAttachment.file)

      // Try to upload to storage if authenticated
      let attachmentId: string | undefined
      if (isAuthenticated) {
        const result = await uploadAttachment({
          data: base64,
          mimeType: documentAttachment.mimeType,
          chatId,
          messageId,
          filename: documentAttachment.filename || documentAttachment.file.name
        })
        if (result.success) {
          attachmentId = result.attachment.id
        }
      }

      return [
        {
          type: 'document',
          mimeType: documentAttachment.mimeType,
          data: base64,
          attachmentId,
          filename: documentAttachment.filename || documentAttachment.file.name
        }
      ]
    },
    [documentAttachment, isAuthenticated]
  )

  // Convert audio attachment to AudioPart for submission
  const getAudioParts = useCallback(
    async (chatId: string, messageId: string): Promise<AudioPart[]> => {
      if (!audioAttachment || !audioAttachment.file) return []

      const base64 = await fileToBase64(audioAttachment.file)

      // Try to upload to storage if authenticated
      let attachmentId: string | undefined
      if (isAuthenticated) {
        const result = await uploadAttachment({
          data: base64,
          mimeType: audioAttachment.mimeType,
          chatId,
          messageId,
          filename: audioAttachment.filename || audioAttachment.file.name
        })
        if (result.success) {
          attachmentId = result.attachment.id
        }
      }

      return [
        {
          type: 'audio',
          mimeType: audioAttachment.mimeType,
          data: base64,
          attachmentId,
          filename: audioAttachment.filename || audioAttachment.file.name
        }
      ]
    },
    [audioAttachment, isAuthenticated]
  )

  return {
    attachments,
    videoAttachment,
    documentAttachment,
    audioAttachment,
    hasAttachments,
    handleFileSelect,
    removeAttachment,
    removeVideoAttachment,
    removeDocumentAttachment,
    removeAudioAttachment,
    clearAttachments,
    getImageParts,
    getVideoParts,
    getDocumentParts,
    getAudioParts
  }
}
