'use client'

import { memo, useCallback, useState } from 'react'

import { Check, Copy, Download, Film, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { SavedVideo } from '@/lib/schema/video'
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

interface SavedVideoCardProps {
  video: SavedVideo
  onDelete: (id: string) => Promise<void>
  isDeleting?: boolean
}

// ============================================
// Component
// ============================================

export const SavedVideoCard = memo(function SavedVideoCard({
  video,
  onDelete,
  isDeleting = false
}: SavedVideoCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  // Format date
  const formattedDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    if (!video.prompt) return
    try {
      await navigator.clipboard.writeText(video.prompt)
      setCopied(true)
      toast.success('Prompt copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [video.prompt])

  // Download video
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(video.url)
      const blob = await response.blob()
      const extension = video.mimeType.split('/')[1] || 'mp4'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `yurie-video-${video.id.slice(0, 8)}.${extension}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download video')
    }
  }, [video.url, video.id, video.mimeType])

  // Delete video
  const handleDelete = useCallback(async () => {
    setShowDeleteConfirm(false)
    await onDelete(video.id)
  }, [video.id, onDelete])

  // Truncate prompt for display
  const truncatedPrompt = video.prompt
    ? video.prompt.length > 100
      ? video.prompt.slice(0, 100) + '...'
      : video.prompt
    : null

  return (
    <>
      {/* Video Card */}
      <div
        className={cn(
          'group relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer',
          'transition-all duration-200',
          'hover:ring-2 hover:ring-primary/20',
          isDeleting && 'opacity-50 pointer-events-none'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsFullscreen(true)}
      >
        {/* Video Thumbnail - show first frame */}
        <video
          src={video.url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'size-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center',
              'transition-all duration-200',
              isHovered ? 'scale-110 bg-background/90' : 'scale-100'
            )}
          >
            <Play className="size-5 ml-0.5" fill="currentColor" />
          </div>
        </div>

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
            <span className="text-card-foreground/70 text-[10px]">
              {formattedDate}
            </span>
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

        {/* Video Badge */}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-[10px] font-medium flex items-center gap-1">
          <Film className="size-2.5" />
          Video
        </div>

        {/* Duration & Resolution Badge */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {video.durationSeconds && (
            <div className="px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-[10px] font-medium">
              {video.durationSeconds}s
            </div>
          )}
          {video.resolution && (
            <div className="px-1.5 py-0.5 rounded bg-card/80 backdrop-blur-sm text-[10px] font-medium">
              {video.resolution}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-full p-5 gap-0 overflow-hidden">
          {/* Framed Video */}
          <div className="flex justify-center">
            <div className="rounded-lg overflow-hidden border bg-black shadow-inner w-fit">
              <video
                src={video.url}
                className="max-h-[65vh] object-contain"
                controls
                autoPlay
                loop
              />
            </div>
          </div>

          {/* Details */}
          <div className="pt-4 space-y-3">
            {/* Prompt with copy */}
            {video.prompt && (
              <div className="group relative">
                <p className="text-sm leading-relaxed pr-8">{video.prompt}</p>
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
                {video.aspectRatio && (
                  <>
                    <span>·</span>
                    <span>{video.aspectRatio}</span>
                  </>
                )}
                {video.resolution && (
                  <>
                    <span>·</span>
                    <span>{video.resolution}</span>
                  </>
                )}
                {video.durationSeconds && (
                  <>
                    <span>·</span>
                    <span>{video.durationSeconds}s</span>
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
            <DialogTitle>AI Generated Video</DialogTitle>
            <DialogDescription>
              {video.prompt || 'View video details'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be
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
