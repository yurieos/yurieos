'use client'

import { memo, useCallback, useState } from 'react'
import Image from 'next/image'

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

  // Calculate aspect ratio style
  const aspectStyle = image.aspectRatio
    ? { aspectRatio: image.aspectRatio.replace(':', ' / ') }
    : { aspectRatio: '1 / 1' } // Fallback for image if not specified

  return (
    <>
      {/* Image Card */}
      <div
        className={cn(
          'group relative w-full rounded-3xl overflow-hidden bg-muted/50 cursor-pointer break-inside-avoid mb-4',
          'ring-1 ring-border/50',
          'transition-all duration-200 ease-out',
          'hover:ring-border hover:shadow-lg hover:shadow-black/5',
          isDeleting && 'opacity-50 pointer-events-none'
        )}
        style={aspectStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsFullscreen(true)}
      >
        <Image
          src={image.url}
          alt={image.prompt || 'AI Generated Image'}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />

        {/* Hover Overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
            'flex flex-col justify-end p-3',
            'transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Prompt preview */}
          {truncatedPrompt && (
            <p className="text-white text-[11px] line-clamp-2 mb-2 leading-relaxed">
              {truncatedPrompt}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-[10px] font-medium">
              {formattedDate}
            </span>
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 bg-white/10 hover:bg-white/25 text-white rounded-full"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 bg-white/10 hover:bg-white/25 text-white rounded-full"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* AI Badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
          <Sparkles className="size-2.5" />
          AI
        </div>

        {/* Aspect Ratio Badge */}
        {image.aspectRatio && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
            {image.aspectRatio}
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden bg-background border shadow-2xl rounded-3xl">
          <div className="flex flex-col md:flex-row max-h-[90vh]">
            {/* Image section */}
            <div className="flex-1 min-h-[300px] md:min-h-[450px] bg-muted/30 flex items-center justify-center p-6">
              <div className="relative w-full h-full min-h-[280px] md:min-h-[400px]">
                <Image
                  src={image.url}
                  alt={image.prompt || 'AI Generated Image'}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Info section */}
            <div className="w-full md:w-72 flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l p-6 max-h-[40vh] md:max-h-none overflow-y-auto bg-background">
              <div className="flex-1 overflow-y-auto space-y-5">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">
                    Prompt
                  </h3>
                  {image.prompt ? (
                    <div className="group relative bg-muted/50 rounded-3xl p-3">
                      <p className="text-sm leading-relaxed pr-6 text-foreground/90">
                        {image.prompt}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 size-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        onClick={handleCopyPrompt}
                        title="Copy prompt"
                      >
                        {copied ? (
                          <Check className="size-3 text-primary" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No prompt available
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">
                      Created
                    </h3>
                    <p className="text-sm">{formattedDate}</p>
                  </div>
                  {image.aspectRatio && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-1">
                        Aspect Ratio
                      </h3>
                      <p className="text-sm">{image.aspectRatio}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full justify-start"
                  onClick={handleDownload}
                >
                  <Download className="size-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setIsFullscreen(false)
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete permanently
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
