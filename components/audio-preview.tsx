'use client'

import { Loader2, Music, X } from 'lucide-react'

import { AudioAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'

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
  const isUploading = attachment.isUploading
  const filename = attachment.filename || attachment.file?.name || 'audio.mp3'
  // Truncate long filenames for display
  const displayName =
    filename.length > 20 ? `${filename.slice(0, 17)}...` : filename

  // Format duration as MM:SS
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Preview container */}
      <div className="relative h-16 w-32 rounded-lg border border-input overflow-hidden bg-muted flex items-center gap-2 px-2">
        {/* Audio icon */}
        <div className="flex-shrink-0 size-8 rounded bg-accent flex items-center justify-center">
          <Music className="size-4 text-accent-foreground" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={filename}>
            {displayName}
          </p>
          {attachment.duration ? (
            <p className="text-[10px] text-muted-foreground">
              {formatDuration(attachment.duration)}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Audio</p>
          )}
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
        aria-label="Remove audio"
      >
        <X size={12} />
      </button>
    </div>
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
        'inline-flex flex-col gap-2 px-3 py-2 rounded-lg',
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
