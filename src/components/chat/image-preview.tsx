'use client'

import { memo, useState } from 'react'

import { X } from 'lucide-react'

import type { ImageAttachment } from '@/lib/types'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <>
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob/data URL preview, Next.js Image cannot optimize */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click opens preview dialog, keyboard focus handled by adjacent remove button */}
        <img
          src={attachment.previewUrl}
          alt="Attachment preview"
          className="h-16 w-auto max-w-32 object-contain rounded-lg border border-input cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsPreviewOpen(true)}
        />
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove(attachment.id)
          }}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
          aria-label="Remove image"
        >
          <X size={12} />
        </button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl p-4 pt-12">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of attached image: {attachment.file.name}
          </DialogDescription>
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob/data URL preview */}
          <img
            src={attachment.previewUrl}
            alt={attachment.file.name}
            className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
          />
        </DialogContent>
      </Dialog>
    </>
  )
})
