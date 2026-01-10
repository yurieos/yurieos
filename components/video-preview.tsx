'use client'

import { useState } from 'react'

import { Loader2, Video, X, Youtube } from 'lucide-react'

import { VideoAttachment, YOUTUBE_URL_PATTERN } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
function getYouTubeThumbnailUrl(videoId: string): string {
  // Use medium quality thumbnail (mqdefault) for good balance of size/quality
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

/**
 * Check if a URL is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url)
}

interface VideoPreviewProps {
  attachment: VideoAttachment
  onRemove: (id: string) => void
  className?: string
}

/**
 * Video Preview Component
 *
 * Displays a preview of an attached video file or YouTube URL.
 * Shows upload progress for File API uploads.
 * Uses key prop to reset error state when attachment changes.
 */
function VideoPreviewInner({
  attachment,
  onRemove,
  className
}: VideoPreviewProps) {
  const [thumbnailError, setThumbnailError] = useState(false)

  const isYouTube = !!attachment.youtubeUrl
  const isUploading = attachment.isUploading

  // For YouTube, extract video ID and get thumbnail
  const youtubeVideoId = attachment.youtubeUrl
    ? extractYouTubeVideoId(attachment.youtubeUrl)
    : null
  const youtubeThumbnail = youtubeVideoId
    ? getYouTubeThumbnailUrl(youtubeVideoId)
    : null

  return (
    <div className={cn('relative group', className)}>
      {/* Preview container */}
      <div className="relative h-16 w-24 rounded-lg border border-input overflow-hidden bg-muted">
        {isYouTube ? (
          // YouTube thumbnail
          <>
            {youtubeThumbnail && !thumbnailError ? (
              <img
                src={youtubeThumbnail}
                alt="YouTube video thumbnail"
                className="h-full w-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              // Fallback when thumbnail fails to load
              <div className="h-full w-full flex items-center justify-center bg-accent">
                <Youtube className="size-6 text-accent-foreground" />
              </div>
            )}
            {/* YouTube badge */}
            <div className="absolute bottom-0.5 right-0.5 bg-primary text-primary-foreground text-[8px] px-1 rounded">
              YT
            </div>
          </>
        ) : attachment.previewUrl ? (
          // Local video preview
          <video
            src={attachment.previewUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // Fallback icon
          <div className="h-full w-full flex items-center justify-center">
            <Video className="size-6 text-muted-foreground" />
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <Loader2 className="size-4 animate-spin text-primary" />
            {attachment.uploadProgress !== undefined && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {Math.round(attachment.uploadProgress)}%
              </span>
            )}
          </div>
        )}

        {/* Video icon badge for local videos */}
        {!isYouTube && !isUploading && (
          <div className="absolute bottom-0.5 right-0.5 bg-primary/80 text-primary-foreground p-0.5 rounded">
            <Video className="size-3" />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        disabled={isUploading}
        className={cn(
          'absolute -top-1.5 -right-1.5 size-5 rounded-full',
          'bg-muted text-muted-foreground',
          'flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-accent',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-label="Remove video"
      >
        <X size={12} />
      </button>
    </div>
  )
}

/**
 * VideoPreview wrapper that uses key to reset state when attachment changes
 */
export function VideoPreview(props: VideoPreviewProps) {
  // Key prop on inner component resets state when attachment ID changes
  return <VideoPreviewInner key={props.attachment.id} {...props} />
}

/**
 * Video display component for user messages
 *
 * Renders the actual video player or YouTube embed for display in messages.
 */
interface VideoDisplayProps {
  mimeType?: string
  data?: string // base64 for inline
  fileUri?: string // For YouTube or displayed File API videos
  className?: string
}

export function VideoDisplay({
  mimeType,
  data,
  fileUri,
  className
}: VideoDisplayProps) {
  // Check if this is a YouTube URL
  const isYouTube = fileUri && isYouTubeUrl(fileUri)
  const youtubeVideoId = fileUri ? extractYouTubeVideoId(fileUri) : null

  if (isYouTube && youtubeVideoId) {
    // Render YouTube embed
    return (
      <div
        className={cn(
          'relative w-full max-w-md aspect-video rounded-lg overflow-hidden',
          className
        )}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}`}
          title="YouTube video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (data && mimeType) {
    // Render inline video
    return (
      <video
        src={`data:${mimeType};base64,${data}`}
        className={cn('max-w-md max-h-64 rounded-lg', className)}
        controls
        playsInline
        preload="metadata"
      />
    )
  }

  // Fallback - video icon placeholder
  return (
    <div
      className={cn(
        'w-48 h-32 rounded-lg bg-muted flex items-center justify-center',
        className
      )}
    >
      <Video className="size-8 text-muted-foreground" />
    </div>
  )
}
