'use client'

import { useState } from 'react'

import { FileText, Loader2, X } from 'lucide-react'

import type { DocumentAttachment } from '@/lib/types'
import { cn } from '@/lib/utils'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isUploading = attachment.isUploading
  const filename =
    attachment.filename || attachment.file?.name || 'document.pdf'
  // Truncate long filenames for display (show more characters)
  const displayName =
    filename.length > 28 ? `${filename.slice(0, 25)}...` : filename

  const handlePreviewClick = () => {
    if (!isUploading && attachment.file) {
      // Create object URL for PDF preview
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
          {/* PDF icon */}
          <div className="flex-shrink-0 size-7 rounded-md bg-red-500/10 flex items-center justify-center">
            <FileText className="size-4 text-red-500" />
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-sm font-medium truncate" title={filename}>
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {attachment.pageCount
                ? `${attachment.pageCount} page${attachment.pageCount !== 1 ? 's' : ''}`
                : 'PDF'}
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
          aria-label="Remove document"
        >
          <X size={12} />
        </button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-3xl w-[90vw] h-[70vh] p-4 pt-12 flex flex-col gap-3">
          <DialogTitle className="sr-only">{filename}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of attached document: {filename}
          </DialogDescription>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={filename}
              className="w-full flex-1 border border-input rounded-xl bg-white"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileText className="size-12 mx-auto mb-2" />
                <p>Unable to preview document</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
        'inline-flex items-center gap-2 px-3 py-2 rounded-3xl',
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
