'use client'

import { FileText, Loader2, X } from 'lucide-react'

import { DocumentAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DocumentPreviewProps {
  attachment: DocumentAttachment
  onRemove: (id: string) => void
  className?: string
}

/**
 * Document Preview Component
 *
 * Displays a preview of an attached PDF document.
 * Shows filename, page count (if known), and upload progress for File API uploads.
 */
export function DocumentPreview({
  attachment,
  onRemove,
  className
}: DocumentPreviewProps) {
  const isUploading = attachment.isUploading
  const filename =
    attachment.filename || attachment.file?.name || 'document.pdf'
  // Truncate long filenames for display
  const displayName =
    filename.length > 20 ? `${filename.slice(0, 17)}...` : filename

  return (
    <div className={cn('relative group', className)}>
      {/* Preview container */}
      <div className="relative h-16 w-32 rounded-lg border border-input overflow-hidden bg-muted flex items-center gap-2 px-2">
        {/* PDF icon */}
        <div className="flex-shrink-0 size-8 rounded bg-accent flex items-center justify-center">
          <FileText className="size-4 text-accent-foreground" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={filename}>
            {displayName}
          </p>
          {attachment.pageCount && (
            <p className="text-[10px] text-muted-foreground">
              {attachment.pageCount} page{attachment.pageCount !== 1 ? 's' : ''}
            </p>
          )}
          {!attachment.pageCount && (
            <p className="text-[10px] text-muted-foreground">PDF</p>
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
        aria-label="Remove document"
      >
        <X size={12} />
      </button>
    </div>
  )
}

/**
 * Document display component for user messages
 *
 * Renders a document attachment display in chat messages.
 * Shows PDF icon with filename.
 */
interface DocumentDisplayProps {
  mimeType?: string
  filename?: string
  className?: string
}

export function DocumentDisplay({
  mimeType,
  filename,
  className
}: DocumentDisplayProps) {
  const displayName = filename || 'document.pdf'
  const truncatedName =
    displayName.length > 30 ? `${displayName.slice(0, 27)}...` : displayName

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-muted border border-input',
        className
      )}
    >
      <div className="flex-shrink-0 size-8 rounded bg-accent flex items-center justify-center">
        <FileText className="size-4 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={displayName}>
          {truncatedName}
        </p>
        <p className="text-xs text-muted-foreground">
          {mimeType === 'application/pdf' ? 'PDF Document' : 'Document'}
        </p>
      </div>
    </div>
  )
}
