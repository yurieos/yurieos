'use client'

import { useRef, useState } from 'react'

import { Play, X } from 'lucide-react'

import type { VideoAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'

/**
 * VideoPreview - Preview component for video attachments in chat input
 */
interface VideoPreviewProps {
  attachment: VideoAttachment
  onRemove: (id: string) => void
}

export function VideoPreview({ attachment, onRemove }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Use previewUrl for local files or youtubeUrl for YouTube videos
  const videoSrc = attachment.previewUrl || attachment.youtubeUrl

  // Show YouTube thumbnail for YouTube videos
  if (attachment.youtubeUrl && !attachment.previewUrl) {
    return (
      <div className="relative group">
        <div className="relative rounded-lg overflow-hidden bg-muted w-20 h-20 flex items-center justify-center">
          <Play className="size-6 text-muted-foreground" />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute -top-2 -right-2 size-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(attachment.id)}
        >
          <X className="size-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="relative rounded-lg overflow-hidden bg-muted w-20 h-20">
        {/* biome-ignore lint/a11y/useMediaCaption: Video preview for user uploads - captions not applicable */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
        />
        {/* Play/Pause overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play
            className={cn('size-6 text-white', isPlaying && 'opacity-50')}
            fill="white"
          />
        </button>
      </div>
      {/* Remove button */}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute -top-2 -right-2 size-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(attachment.id)}
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

/**
 * VideoDisplay - Display component for videos in user messages
 * Handles both inline data URLs and external URLs (File API, YouTube)
 */
interface VideoDisplayProps {
  mimeType?: string
  data?: string // base64 encoded video data
  fileUri?: string // URL for File API or YouTube
}

export function VideoDisplay({ mimeType, data, fileUri }: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Determine video source
  const videoSrc = data
    ? `data:${mimeType || 'video/mp4'};base64,${data}`
    : fileUri

  // Handle YouTube URLs
  const isYouTube =
    fileUri && (fileUri.includes('youtube.com') || fileUri.includes('youtu.be'))

  if (isYouTube) {
    // Extract video ID and create embed URL
    let videoId = ''
    if (fileUri.includes('youtube.com/watch')) {
      const url = new URL(fileUri)
      videoId = url.searchParams.get('v') || ''
    } else if (fileUri.includes('youtu.be/')) {
      videoId = fileUri.split('youtu.be/')[1]?.split('?')[0] || ''
    }

    if (videoId) {
      return (
        <div className="relative rounded-lg overflow-hidden bg-muted max-w-xs">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video"
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
  }

  if (!videoSrc) {
    return (
      <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Video unavailable
      </div>
    )
  }

  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted max-w-xs">
      {/* biome-ignore lint/a11y/useMediaCaption: Video display for user messages - captions not applicable for user-uploaded content */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full max-h-48 object-contain"
        onEnded={() => setIsPlaying(false)}
        controls
      />
      {/* Play overlay (shown when not playing and no controls visible) */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="size-8 text-white" fill="white" />
        </button>
      )}
    </div>
  )
}
