'use client'

import { memo, useCallback, useState } from 'react'

import { Download, Edit, Maximize2, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

// ============================================
// Types
// ============================================

interface GeneratedImageProps {
  /** Base64 encoded image data */
  imageData: string
  /** MIME type of the image */
  mimeType: string
  /** Aspect ratio hint for display */
  aspectRatio?: string
  /** Alt text for accessibility */
  alt?: string
  /** Callback when "Edit" is clicked (for multi-turn editing) */
  onEdit?: (imageData: string, mimeType: string) => void
  /** Callback when "Use as Reference" is clicked */
  onUseAsReference?: (imageData: string, mimeType: string) => void
  /** Additional className */
  className?: string
}

// ============================================
// Component
// ============================================

export const GeneratedImage = memo(function GeneratedImage({
  imageData,
  mimeType,
  aspectRatio,
  alt = 'AI Generated Image',
  onEdit,
  onUseAsReference,
  className
}: GeneratedImageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Build data URL
  const dataUrl = `data:${mimeType};base64,${imageData}`

  // Download image
  const handleDownload = useCallback(() => {
    const extension = mimeType.split('/')[1] || 'png'
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `generated-image-${Date.now()}.${extension}`
    link.click()
  }, [dataUrl, mimeType])

  // Edit image (trigger multi-turn editing)
  const handleEdit = useCallback(() => {
    onEdit?.(imageData, mimeType)
  }, [imageData, mimeType, onEdit])

  // Use as reference
  const handleUseAsReference = useCallback(() => {
    onUseAsReference?.(imageData, mimeType)
  }, [imageData, mimeType, onUseAsReference])

  return (
    <>
      {/* Image Display */}
      <div
        className={cn(
          'relative group rounded-lg overflow-hidden bg-muted/50 border',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={dataUrl}
          alt={alt}
          className={cn(
            'w-full max-w-md h-auto object-contain',
            aspectRatio === '9:16' ||
              aspectRatio === '2:3' ||
              aspectRatio === '3:4' ||
              aspectRatio === '4:5'
              ? 'max-h-[500px]'
              : 'max-h-[400px]'
          )}
          loading="lazy"
        />

        {/* Hover Actions */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9"
            onClick={() => setIsFullscreen(true)}
            title="View fullscreen"
          >
            <Maximize2 size={16} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9"
            onClick={handleDownload}
            title="Download image"
          >
            <Download size={16} />
          </Button>
          {onEdit && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-9"
              onClick={handleEdit}
              title="Edit image"
            >
              <Edit size={16} />
            </Button>
          )}
          {onUseAsReference && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-9"
              onClick={handleUseAsReference}
              title="Use as reference"
            >
              <Sparkles size={16} />
            </Button>
          )}
        </div>

        {/* AI Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1">
          <Sparkles size={12} />
          AI Generated
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles size={16} />
              AI Generated Image
            </DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center bg-black min-h-[60vh]">
            <img
              src={dataUrl}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownload}
            >
              <Download size={14} className="mr-1" />
              Download
            </Button>
            {onEdit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsFullscreen(false)
                  handleEdit()
                }}
              >
                <Edit size={14} className="mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

// ============================================
// Thinking Image Display
// ============================================

interface ThinkingImageProps {
  /** Base64 encoded image data */
  imageData: string
  /** MIME type of the image */
  mimeType: string
  /** Label for the thinking step */
  label?: string
  /** Additional className */
  className?: string
}

/**
 * Display interim "thinking" images from the image generation process
 * These are smaller previews showing the model's iterative composition
 */
export const ThinkingImage = memo(function ThinkingImage({
  imageData,
  mimeType,
  label = 'Thinking...',
  className
}: ThinkingImageProps) {
  const dataUrl = `data:${mimeType};base64,${imageData}`

  return (
    <div className={cn('relative', className)}>
      <div className="relative rounded-md overflow-hidden border border-dashed border-muted-foreground/30 bg-muted/30">
        <img
          src={dataUrl}
          alt="AI thinking process"
          className="w-32 h-auto object-contain opacity-70"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-[10px] font-medium flex items-center gap-1">
          <span className="relative inline-flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-current" />
          </span>
          {label}
        </div>
      </div>
    </div>
  )
})

// ============================================
// Image Generation Loading State
// ============================================

interface ImageGenerationLoadingProps {
  /** Status message to display */
  status?: string
  /** Additional className */
  className?: string
}

/**
 * Loading state for image generation
 */
export const ImageGenerationLoading = memo(function ImageGenerationLoading({
  status = 'Generating image...',
  className
}: ImageGenerationLoadingProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border bg-muted/50 p-8',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <Sparkles className="absolute inset-0 m-auto size-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{status}</p>
      </div>
    </div>
  )
})
