'use client'

import { memo } from 'react'

import { X } from 'lucide-react'

import { ImageAttachment } from '@/lib/types'

interface ImagePreviewProps {
  attachment: ImageAttachment
  onRemove: (id: string) => void
}

/**
 * Image Preview Component for chat attachments
 */
export const ImagePreview = memo(function ImagePreview({
  attachment,
  onRemove
}: ImagePreviewProps) {
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
})
