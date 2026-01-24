'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

import { Copy, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import type {
  MessageAudioPart,
  MessageDocumentPart,
  MessageImagePart,
  MessageVideoPart
} from '@/lib/types'
import { cn } from '@/lib/utils'

import { AudioDisplay } from './audio-preview'
import { CollapsibleMessage } from './collapsible-message'
import { DocumentDisplay } from './document-preview'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { VideoDisplay } from './video-preview'

/**
 * Hook to fetch signed URL for an attachment
 * Returns { url, isLoading, error } for the given attachmentId
 */
function useAttachmentUrl(attachmentId?: string): {
  url: string | null
  isLoading: boolean
  error: string | null
} {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Skip fetch if no attachmentId
    if (!attachmentId) {
      // Don't call setState here - just rely on initial state
      return
    }

    let isMounted = true
    const controller = new AbortController()

    // Start loading in a callback (not synchronously)
    const doFetch = async () => {
      try {
        const res = await fetch(`/api/attachments/${attachmentId}`, {
          signal: controller.signal
        })
        if (!res.ok) {
          throw new Error('Failed to load attachment')
        }
        const data = await res.json()
        if (isMounted) {
          setUrl(data.url)
          setIsLoading(false)
        }
      } catch (err: unknown) {
        if (isMounted && (err as Error).name !== 'AbortError') {
          setError((err as Error).message)
          setIsLoading(false)
        }
      }
    }

    // Set loading state and start fetch
    setIsLoading(true)
    setError(null)
    setUrl(null)
    doFetch()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [attachmentId])

  // When no attachmentId, return static values
  if (!attachmentId) {
    return { url: null, isLoading: false, error: null }
  }

  return { url, isLoading, error }
}

/**
 * Image display component that handles both inline data and attachment IDs
 */
function ImageDisplay({
  image,
  index,
  totalImages
}: {
  image: MessageImagePart
  index: number
  totalImages: number
}) {
  const { url, isLoading, error } = useAttachmentUrl(image.attachmentId)

  // Determine the source URL
  const src = image.data ? `data:${image.mimeType};base64,${image.data}` : url

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          'rounded-3xl',
          totalImages === 1 ? 'h-48 w-48' : 'h-20 w-20'
        )}
      />
    )
  }

  if (error || (!image.data && !url)) {
    return (
      <div
        className={cn(
          'rounded-3xl bg-muted flex items-center justify-center text-xs text-muted-foreground',
          totalImages === 1 ? 'h-48 w-48' : 'h-20 w-20'
        )}
      >
        Failed to load
      </div>
    )
  }

  // Should not reach here due to earlier checks, but satisfy TypeScript
  if (!src) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Base64 data URL or Supabase signed URL, Next.js Image cannot optimize
    <img
      src={src}
      alt={image.filename || `Attachment ${index + 1}`}
      className={cn(
        'rounded-3xl object-cover',
        totalImages === 1 ? 'max-h-48 w-auto' : 'h-20 w-20'
      )}
    />
  )
}

/**
 * Video display component that handles both inline data and attachment IDs
 */
function VideoDisplayWithAttachment({ video }: { video: MessageVideoPart }) {
  const { url, isLoading, error } = useAttachmentUrl(video.attachmentId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading video...
      </div>
    )
  }

  // If we have an attachment URL, use it; otherwise fall back to inline data or fileUri
  const videoUrl = url || (video.data ? undefined : video.fileUri)
  const videoData = video.data

  if (error && !videoData && !video.fileUri) {
    return (
      <div className="text-xs text-muted-foreground">Failed to load video</div>
    )
  }

  return (
    <VideoDisplay
      mimeType={video.mimeType}
      data={videoData}
      fileUri={url || video.fileUri}
    />
  )
}

/**
 * Audio display component that handles both inline data and attachment IDs
 */
function AudioDisplayWithAttachment({ audio }: { audio: MessageAudioPart }) {
  const { url, isLoading, error } = useAttachmentUrl(audio.attachmentId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading audio...
      </div>
    )
  }

  if (error && !audio.data && !audio.fileUri) {
    return (
      <div className="text-xs text-muted-foreground">Failed to load audio</div>
    )
  }

  return (
    <AudioDisplay
      mimeType={audio.mimeType}
      data={audio.data}
      fileUri={url || audio.fileUri}
      filename={audio.filename}
    />
  )
}

type UserMessageProps = {
  message: string
  messageId?: string
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  /** Image attachments for the message */
  images?: MessageImagePart[]
  /** Video attachments for the message */
  videos?: MessageVideoPart[]
  /** Document attachments for the message */
  documents?: MessageDocumentPart[]
  /** Audio attachments for the message */
  audios?: MessageAudioPart[]
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  messageId,
  onUpdateMessage,
  images,
  videos,
  documents,
  audios
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message)
  const hasImages = images && images.length > 0
  const hasVideos = videos && videos.length > 0
  const hasDocuments = documents && documents.length > 0
  const hasAudios = audios && audios.length > 0

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setEditedContent(message)
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setIsEditing(false)
  }

  const handleSaveClick = async () => {
    if (!onUpdateMessage || !messageId) return

    setIsEditing(false)

    try {
      await onUpdateMessage(messageId, editedContent)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleCopyClick = async () => {
    await navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard')
  }

  const hasAttachments = hasImages || hasVideos || hasDocuments || hasAudios

  return (
    <div className="flex flex-col items-end gap-2 group">
      {/* Attachments (separate from text bubble) */}
      {!isEditing && hasAttachments && (
        <div className="flex flex-col items-end gap-2 max-w-[85%]">
          {/* Media attachments */}
          {hasImages && (
            <div
              className={cn(
                'flex flex-wrap gap-2 justify-end',
                images.length === 1 ? 'max-w-xs' : ''
              )}
            >
              {images.map((img, idx) => (
                <ImageDisplay
                  key={img.attachmentId || idx}
                  image={img}
                  index={idx}
                  totalImages={images.length}
                />
              ))}
            </div>
          )}

          {hasVideos && (
            <div className="flex flex-wrap gap-2 justify-end">
              {videos.map((vid, idx) => (
                <VideoDisplayWithAttachment
                  key={vid.attachmentId || idx}
                  video={vid}
                />
              ))}
            </div>
          )}

          {hasDocuments && (
            <div className="flex flex-wrap gap-2 justify-end">
              {documents.map((doc, idx) => (
                <DocumentDisplay
                  key={doc.attachmentId || idx}
                  mimeType={doc.mimeType}
                  filename={doc.filename}
                />
              ))}
            </div>
          )}

          {hasAudios && (
            <div className="flex flex-wrap gap-2 justify-end">
              {audios.map((aud, idx) => (
                <AudioDisplayWithAttachment
                  key={aud.attachmentId || idx}
                  audio={aud}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text message bubble */}
      <div className="flex items-center justify-end gap-[3px]">
        {!isEditing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full size-8 shrink-0 transition-opacity',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              )}
              onClick={handleEditClick}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full size-8 shrink-0 transition-opacity',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              )}
              onClick={handleCopyClick}
            >
              <Copy className="size-3.5" />
            </Button>
          </>
        )}
        <CollapsibleMessage messageRole="user">
          <div className="min-w-0 wrap-break-word outline-hidden relative">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <TextareaAutosize
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  autoFocus
                  className="resize-none flex w-full rounded-3xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                  minRows={2}
                  maxRows={10}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelClick}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveClick}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 wrap-break-word">
                {message && <div>{message}</div>}
              </div>
            )}
          </div>
        </CollapsibleMessage>
      </div>
    </div>
  )
}
