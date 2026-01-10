'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'

import { UIMessage } from 'ai'
import {
  ChevronDown,
  CornerRightUp,
  Image,
  Loader2,
  Paperclip,
  Square,
  Telescope,
  X
} from 'lucide-react'
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
  MAX_AUDIO_INLINE_SIZE_MB,
  MAX_DOCUMENT_FILE_SIZE_MB,
  MAX_DOCUMENT_INLINE_SIZE_MB,
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGES_PER_MESSAGE,
  MAX_VIDEO_FILE_SIZE_MB,
  MAX_VIDEO_INLINE_SIZE_MB,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SupportedAudioType,
  SupportedDocumentType,
  SupportedImageType,
  SupportedVideoType,
  VideoAttachment,
  VideoPart
} from '@/lib/types'
import { cn } from '@/lib/utils'

import { useCurrentUserName, useIsAuthenticated } from '@/hooks'

import { Button } from './ui/button'
import { AudioPreview } from './audio-preview'
import type { ResearchMode } from './chat'
import { DocumentPreview } from './document-preview'
import { EmptyScreen } from './empty-screen'
import { ImagineModal } from './imagine-modal'
import { VideoPreview } from './video-preview'

/** All supported file types for the unified file input */
const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_AUDIO_TYPES
]

/** Tool invocation part type for AI SDK v6 */
interface ToolInvocationPart {
  type: string
  state?: 'input-available' | 'input-streaming' | 'output-available' | string
}

/**
 * Convert a File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
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
function isValidImageType(
  file: File
): file is File & { type: SupportedImageType } {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)
}

/**
 * Validate if a file is a supported video type
 */
function isValidVideoType(
  file: File
): file is File & { type: SupportedVideoType } {
  return SUPPORTED_VIDEO_TYPES.includes(file.type as SupportedVideoType)
}

/**
 * Validate if a file is a supported document type
 */
function isValidDocumentType(
  file: File
): file is File & { type: SupportedDocumentType } {
  return SUPPORTED_DOCUMENT_TYPES.includes(file.type as SupportedDocumentType)
}

/**
 * Validate if a file is a supported audio type
 */
function isValidAudioType(
  file: File
): file is File & { type: SupportedAudioType } {
  return SUPPORTED_AUDIO_TYPES.includes(file.type as SupportedAudioType)
}

/**
 * Image Preview Component
 */
function ImagePreview({
  attachment,
  onRemove
}: {
  attachment: ImageAttachment
  onRemove: (id: string) => void
}) {
  return (
    <div className="relative group">
      <img
        src={attachment.previewUrl}
        alt="Attachment preview"
        className="h-16 w-16 object-cover rounded-lg border border-input"
      />
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
        aria-label="Remove image"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// Deep Research Toggle Button Component
// Uses official Gemini Deep Research Agent via Interactions API
// @see https://ai.google.dev/gemini-api/docs/deep-research
function DeepResearchToggle({
  isActive,
  onToggle,
  disabled = false
}: {
  isActive: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg',
        'text-xs font-medium transition-colors duration-200',
        'border border-input bg-background',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Telescope size={14} />
      <span>Deep Research</span>
    </button>
  )
}

// Imagine Button Component
// Opens the Nano Banana image generation modal
// @see https://ai.google.dev/gemini-api/docs/image-generation
function ImagineButton({
  disabled = false,
  onOpenModal
}: {
  disabled?: boolean
  onOpenModal: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpenModal}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg',
        'text-xs font-medium transition-colors duration-200',
        'border border-input bg-background',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Image size={14} />
      <span>Imagine</span>
    </button>
  )
}

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    images?: ImagePart[],
    videos?: VideoPart[],
    documents?: DocumentPart[],
    audios?: AudioPart[]
  ) => void
  isLoading: boolean
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
  query?: string
  stop: () => void
  append: (message: {
    role: string
    content: string
    images?: ImagePart[]
    videos?: VideoPart[]
    documents?: DocumentPart[]
    audios?: AudioPart[]
  }) => void
  /** Whether to show the scroll to bottom button */
  showScrollToBottomButton: boolean
  /** Reference to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Current research mode */
  researchMode?: ResearchMode
  /** Callback when research mode changes */
  onResearchModeChange?: (mode: ResearchMode) => void
  /** Chat ID for attachment storage */
  chatId?: string
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  setMessages,
  query,
  stop,
  append,
  showScrollToBottomButton,
  scrollContainerRef,
  researchMode = 'standard',
  onResearchModeChange,
  chatId
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false) // Composition state
  const [enterDisabled, setEnterDisabled] = useState(false) // Disable Enter after composition ends
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [videoAttachment, setVideoAttachment] =
    useState<VideoAttachment | null>(null)
  const [documentAttachment, setDocumentAttachment] =
    useState<DocumentAttachment | null>(null)
  const [audioAttachment, setAudioAttachment] =
    useState<AudioAttachment | null>(null)
  const [isImagineModalOpen, setIsImagineModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fullName = useCurrentUserName()
  const firstName = fullName.split(' ')[0]
  const isAuthenticated = useIsAuthenticated()

  const isDeepResearch = researchMode === 'deep-research'

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => {
      setEnterDisabled(false)
    }, 300)
  }

  const isToolInvocationInProgress = useCallback(() => {
    if (!messages.length) return false

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false

    const parts = lastMessage.parts
    const lastPart = parts[parts.length - 1] as ToolInvocationPart | undefined

    // In v6, tool parts have type like 'tool-{toolName}' and state directly on the part
    return (
      lastPart?.type?.startsWith('tool-') &&
      (lastPart?.state === 'input-available' ||
        lastPart?.state === 'input-streaming')
    )
  }, [messages])

  const toggleResearchMode = useCallback(() => {
    const newMode: ResearchMode = isDeepResearch ? 'standard' : 'deep-research'
    onResearchModeChange?.(newMode)
  }, [isDeepResearch, onResearchModeChange])

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
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
            id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
            id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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

  // Remove attachment
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

  // Clear all attachments (images, video, documents, and audio)
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
  // If authenticated, uploads to storage and includes attachmentId
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
          // If upload fails, continue without attachmentId (will still work with base64)
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
  // If authenticated, uploads to storage and includes attachmentId
  const getVideoParts = useCallback(
    async (chatId: string, messageId: string): Promise<VideoPart[]> => {
      if (!videoAttachment) return []

      // YouTube URL - use fileUri (no storage needed)
      if (videoAttachment.youtubeUrl) {
        return [
          {
            type: 'video',
            fileUri: videoAttachment.youtubeUrl
          }
        ]
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
  // If authenticated, uploads to storage and includes attachmentId
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
  // If authenticated, uploads to storage and includes attachmentId
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

  // Keyboard shortcut for toggling Deep Research mode (Cmd+D / Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+D (Mac) or Ctrl+D (Windows/Linux)
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'd'
      ) {
        e.preventDefault()
        // Don't toggle if loading or tool invocation in progress
        if (!isLoading && !isToolInvocationInProgress()) {
          toggleResearchMode()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, isToolInvocationInProgress, toggleResearchMode])

  // if query is not empty, submit the query
  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({
        role: 'user',
        content: query
      })
      isFirstRender.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(a => URL.revokeObjectURL(a.previewUrl))
      if (videoAttachment?.previewUrl) {
        URL.revokeObjectURL(videoAttachment.previewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to the bottom of the container
  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Handle form submission with images, videos, documents, and audio
  // Uploads attachments to storage (if authenticated) before submission
  const onFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (
        !input.trim() &&
        attachments.length === 0 &&
        !videoAttachment &&
        !documentAttachment &&
        !audioAttachment
      )
        return

      // Generate message ID for attachment storage
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const currentChatId = chatId || `chat-${Date.now()}`

      // Show uploading state if authenticated and has attachments
      const hasAttachmentsToUpload =
        isAuthenticated &&
        (attachments.length > 0 ||
          videoAttachment ||
          documentAttachment ||
          audioAttachment)

      if (hasAttachmentsToUpload) {
        setIsUploading(true)
      }

      try {
        const images =
          attachments.length > 0
            ? await getImageParts(currentChatId, messageId)
            : undefined
        const videos = videoAttachment
          ? await getVideoParts(currentChatId, messageId)
          : undefined
        const documents = documentAttachment
          ? await getDocumentParts(currentChatId, messageId)
          : undefined
        const audios = audioAttachment
          ? await getAudioParts(currentChatId, messageId)
          : undefined

        handleSubmit(e, images, videos, documents, audios)
        clearAttachments()
      } catch (error) {
        console.error('Error uploading attachments:', error)
        toast.error('Failed to upload some attachments')
      } finally {
        setIsUploading(false)
      }
    },
    [
      input,
      attachments.length,
      videoAttachment,
      documentAttachment,
      audioAttachment,
      chatId,
      isAuthenticated,
      getImageParts,
      getVideoParts,
      getDocumentParts,
      getAudioParts,
      handleSubmit,
      clearAttachments
    ]
  )

  // Track if any attachments exist
  const hasAttachments = useMemo(
    () =>
      attachments.length > 0 ||
      !!videoAttachment ||
      !!documentAttachment ||
      !!audioAttachment,
    [attachments.length, videoAttachment, documentAttachment, audioAttachment]
  )

  const hasContent = input.trim().length > 0 || hasAttachments

  return (
    <div
      className={cn(
        'w-full bg-background group/form-container shrink-0',
        messages.length > 0 ? 'sticky bottom-0 px-2 pb-4' : 'px-6'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <p className="text-center text-[1.625rem] font-semibold">
            {isDeepResearch ? (
              'What are you researching?'
            ) : firstName && firstName !== '?' ? (
              <>
                Hello, <em>{firstName}</em>.
              </>
            ) : (
              'What can I help with?'
            )}
          </p>
        </div>
      )}
      <form
        onSubmit={onFormSubmit}
        className={cn('max-w-3xl w-full mx-auto relative')}
      >
        {/* Hidden unified file input for all attachments */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_SUPPORTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Attach files"
        />

        {/* Scroll to bottom button - only shown when showScrollToBottomButton is true */}
        {showScrollToBottomButton && messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -top-10 right-4 z-20 size-8 rounded-full shadow-md"
            onClick={handleScrollToBottom}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </Button>
        )}

        <div className="relative flex flex-col w-full gap-2 bg-muted rounded-lg border border-input">
          {/* Media previews (images, video, documents, and audio) */}
          {(attachments.length > 0 ||
            videoAttachment ||
            documentAttachment ||
            audioAttachment) && (
            <div className="flex flex-wrap gap-2 p-3 pb-0">
              {/* Image previews */}
              {attachments.map(attachment => (
                <ImagePreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={removeAttachment}
                />
              ))}
              {/* Video preview */}
              {videoAttachment && (
                <VideoPreview
                  attachment={videoAttachment}
                  onRemove={removeVideoAttachment}
                />
              )}
              {/* Document preview */}
              {documentAttachment && (
                <DocumentPreview
                  attachment={documentAttachment}
                  onRemove={removeDocumentAttachment}
                />
              )}
              {/* Audio preview */}
              {audioAttachment && (
                <AudioPreview
                  attachment={audioAttachment}
                  onRemove={removeAudioAttachment}
                />
              )}
            </div>
          )}

          <Textarea
            ref={inputRef}
            name="input"
            rows={2}
            maxRows={5}
            tabIndex={0}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={
              isDeepResearch ? 'Get a detailed report' : 'Ask anything'
            }
            spellCheck={false}
            value={input}
            disabled={isLoading || isToolInvocationInProgress()}
            className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onChange={e => {
              handleInputChange(e)
              setShowEmptyScreen(e.target.value.length === 0)
            }}
            onKeyDown={async e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !isComposing &&
                !enterDisabled
              ) {
                if (!hasContent) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                const textarea = e.target as HTMLTextAreaElement
                textarea.form?.requestSubmit()
              }
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />

          {/* Bottom menu area */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  'size-8 rounded-lg text-muted-foreground hover:text-accent-foreground',
                  hasAttachments && 'text-primary border-primary'
                )}
                disabled={isLoading || isToolInvocationInProgress()}
                onClick={() => fileInputRef.current?.click()}
                title="Attach files (images, videos, PDFs, audio)"
              >
                <Paperclip size={14} />
              </Button>
              <DeepResearchToggle
                isActive={isDeepResearch}
                onToggle={toggleResearchMode}
                disabled={isLoading || isToolInvocationInProgress()}
              />
              <ImagineButton
                disabled={isLoading || isToolInvocationInProgress()}
                onOpenModal={() => setIsImagineModalOpen(true)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type={isLoading || isUploading ? 'button' : 'submit'}
                size={'icon'}
                variant={'outline'}
                className={cn(
                  (isLoading || isUploading) && 'animate-pulse',
                  'rounded-lg size-8'
                )}
                disabled={
                  (!hasContent && !isLoading && !isUploading) ||
                  isToolInvocationInProgress() ||
                  isUploading
                }
                onClick={isLoading ? stop : undefined}
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isLoading ? (
                  <Square size={16} />
                ) : (
                  <CornerRightUp size={16} />
                )}
              </Button>
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message => {
              append({
                role: 'user',
                content: message
              })
            }}
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>

      {/* Imagine Modal for AI Image Generation */}
      <ImagineModal
        open={isImagineModalOpen}
        onOpenChange={setIsImagineModalOpen}
        isAuthenticated={isAuthenticated}
        onImageGenerated={(imageData, mimeType) => {
          // Add the generated image as an attachment
          const attachment: ImageAttachment = {
            id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file: new File(
              [Uint8Array.from(atob(imageData), c => c.charCodeAt(0))],
              `generated-image-${Date.now()}.${mimeType.split('/')[1]}`,
              { type: mimeType }
            ),
            previewUrl: `data:${mimeType};base64,${imageData}`,
            mimeType: mimeType as SupportedImageType,
            base64: imageData
          }
          setAttachments(prev => [...prev, attachment])
        }}
      />
    </div>
  )
}
