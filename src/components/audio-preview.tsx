'use client'

import { useState } from 'react'

import { Loader2, Music, X } from 'lucide-react'

import type { AudioAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'

interface AudioPreviewProps {
  attachment: AudioAttachment
  onRemove: (id: string) => void
  className?: string
}

/**
 * Audio Preview Component
 *
 * Displays a preview of an attached audio file.
 * Shows filename, duration (if known), and upload progress for File API uploads.
 */
export function AudioPreview({
  attachment,
  onRemove,
  className
}: AudioPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isUploading = attachment.isUploading
  const filename = attachment.filename || attachment.file?.name || 'audio.mp3'
  // Truncate long filenames for display (show more characters)
  const displayName =
    filename.length > 28 ? `${filename.slice(0, 25)}...` : filename

  // Format duration as MM:SS
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePreviewClick = () => {
    if (!isUploading && attachment.file) {
      // Create object URL for audio preview
      const url = URL.createObjectURL(attachment.file)
      setPreviewUrl(url)
      setIsPreviewOpen(true)
    }
  }

  const handleClosePreview = (open: boolean) => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setIsPreviewOpen(open)
  }

  return (
    <>
      <div className={cn('relative group', className)}>
        {/* Preview container */}
        <div
          className={cn(
            'relative h-12 px-3 rounded-lg border border-input overflow-hidden bg-muted flex items-center gap-2.5',
            !isUploading &&
              attachment.file &&
              'cursor-pointer hover:bg-muted/80 transition-colors'
          )}
          onClick={handlePreviewClick}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handlePreviewClick()
            }
          }}
          // biome-ignore lint/a11y/useSemanticElements: Interactive div with complex layout, using proper keyboard and role attributes
          role="button"
          tabIndex={!isUploading && attachment.file ? 0 : -1}
        >
          {/* Audio icon */}
          <div className="flex-shrink-0 size-7 rounded-md bg-purple-500/10 flex items-center justify-center">
            <Music className="size-4 text-purple-500" />
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-sm font-medium truncate" title={filename}>
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {attachment.duration
                ? formatDuration(attachment.duration)
                : 'Audio'}
            </p>
          </div>

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
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove(attachment.id)
          }}
          disabled={isUploading}
          className={cn(
            'absolute -top-1.5 -right-1.5 size-5 rounded-full',
            'bg-muted text-muted-foreground',
            'flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Remove audio"
        >
          <X size={12} />
        </button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-md p-6 pt-12">
          <DialogTitle className="sr-only">Audio Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of attached audio: {filename}
          </DialogDescription>
          <div className="flex flex-col items-center gap-4">
            <div className="size-20 rounded-full bg-accent flex items-center justify-center">
              <Music className="size-10 text-accent-foreground" />
            </div>
            <div className="text-center">
              <p
                className="font-medium truncate max-w-[300px]"
                title={filename}
              >
                {filename}
              </p>
              {attachment.duration && (
                <p className="text-sm text-muted-foreground">
                  {formatDuration(attachment.duration)}
                </p>
              )}
            </div>
            {previewUrl && (
              // biome-ignore lint/a11y/useMediaCaption: Audio preview dialog - captions not applicable for user-uploaded audio files
              <audio
                src={previewUrl}
                controls
                autoPlay
                className="w-full"
                preload="metadata"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Audio display component for user messages
 *
 * Renders an audio attachment display in chat messages.
 * Shows a compact audio player.
 */
interface AudioDisplayProps {
  mimeType?: string
  data?: string // base64 encoded audio
  fileUri?: string
  filename?: string
  className?: string
}

export function AudioDisplay({
  mimeType,
  data,
  fileUri,
  filename,
  className
}: AudioDisplayProps) {
  const displayName = filename || 'Audio'
  const truncatedName =
    displayName.length > 30 ? `${displayName.slice(0, 27)}...` : displayName

  // If we have base64 data, create a data URL for the audio element
  const audioSrc = data
    ? `data:${mimeType || 'audio/mp3'};base64,${data}`
    : null

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-2 px-3 py-2 rounded-3xl',
        'bg-muted border border-input max-w-xs',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 size-8 rounded bg-accent flex items-center justify-center">
          <Music className="size-4 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={displayName}>
            {truncatedName}
          </p>
          <p className="text-xs text-muted-foreground">
            {mimeType ? mimeType.replace('audio/', '').toUpperCase() : 'Audio'}
          </p>
        </div>
      </div>
      {/* Audio player - only show if we have data */}
      {audioSrc && (
        // biome-ignore lint/a11y/useMediaCaption: Audio display for user messages - captions not applicable for user-uploaded audio files
        <audio controls className="w-full h-8" preload="metadata">
          <source src={audioSrc} type={mimeType || 'audio/mp3'} />
          Your browser does not support the audio element.
        </audio>
      )}
      {/* Show message if we only have fileUri (File API) */}
      {!audioSrc && fileUri && (
        <p className="text-xs text-muted-foreground italic">
          Audio uploaded via File API
        </p>
      )}
    </div>
  )
}
