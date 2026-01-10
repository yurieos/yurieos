'use client'

import { memo, useCallback, useState } from 'react'

import { Check, Copy, Download, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { SavedImage } from '@/lib/schema/image'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

// ============================================
// Types
// ============================================

interface SavedImageCardProps {
  image: SavedImage
  onDelete: (id: string) => Promise<void>
  isDeleting?: boolean
}

// ============================================
// Component
// ============================================

export const SavedImageCard = memo(function SavedImageCard({
  image,
  onDelete,
  isDeleting = false
}: SavedImageCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  // Format date
  const formattedDate = new Date(image.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    if (!image.prompt) return
    try {
      await navigator.clipboard.writeText(image.prompt)
      setCopied(true)
      toast.success('Prompt copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [image.prompt])

  // Download image
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const extension = image.mimeType.split('/')[1] || 'png'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `yurie-image-${image.id.slice(0, 8)}.${extension}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [image.url, image.id, image.mimeType])

  // Delete image
  const handleDelete = useCallback(async () => {
    setShowDeleteConfirm(false)
    await onDelete(image.id)
  }, [image.id, onDelete])

  // Truncate prompt for display
  const truncatedPrompt = image.prompt
    ? image.prompt.length > 100
      ? image.prompt.slice(0, 100) + '...'
      : image.prompt
    : null

  return (
    <>
      {/* Image Card */}
      <div
        className={cn(
          'group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer',
          'transition-all duration-200',
          'hover:ring-2 hover:ring-primary/20',
          isDeleting && 'opacity-50 pointer-events-none'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsFullscreen(true)}
      >
        {/* Image */}
        <img
          src={image.url}
          alt={image.prompt || 'AI Generated Image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Hover Overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent',
            'flex flex-col justify-end p-2.5',
            'transition-opacity duration-150',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Prompt preview */}
          {truncatedPrompt && (
            <p className="text-foreground text-[11px] line-clamp-2 mb-1.5">
              {truncatedPrompt}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span className="text-card-foreground/70 text-[10px]">{formattedDate}</span>
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 bg-card/70 hover:bg-card/90 backdrop-blur-sm"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 bg-card/70 hover:bg-card/90 backdrop-blur-sm"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* AI Badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-[10px] font-medium flex items-center gap-1">
          <Sparkles className="size-2.5" />
          AI
        </div>

        {/* Aspect Ratio Badge */}
        {image.aspectRatio && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-[10px] font-medium">
            {image.aspectRatio}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-3xl w-full p-5 gap-0 overflow-hidden">
          {/* Framed Image */}
          <div className="flex justify-center">
            <div className="rounded-lg overflow-hidden border bg-muted/30 shadow-inner w-fit">
              <img
                src={image.url}
                alt={image.prompt || 'AI Generated Image'}
                className="max-h-[65vh] object-contain"
              />
            </div>
          </div>

          {/* Details */}
          <div className="pt-4 space-y-3">
            {/* Prompt with copy */}
            {image.prompt && (
              <div className="group relative">
                <p className="text-sm leading-relaxed pr-8">{image.prompt}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopyPrompt}
                  title="Copy prompt"
                >
                  {copied ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            )}

            {/* Meta and actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formattedDate}</span>
                {image.aspectRatio && (
                  <>
                    <span>·</span>
                    <span>{image.aspectRatio}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="size-4 mr-1.5" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsFullscreen(false)
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="size-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          <DialogHeader className="sr-only">
            <DialogTitle>AI Generated Image</DialogTitle>
            <DialogDescription>
              {image.prompt || 'View image details'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})
