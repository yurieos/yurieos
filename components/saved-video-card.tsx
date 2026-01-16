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

  // Calculate aspect ratio style
  const aspectStyle = video.aspectRatio
    ? { aspectRatio: video.aspectRatio.replace(':', ' / ') }
    : { aspectRatio: '16 / 9' } // Default for video if not specified

  return (
    <>
      {/* Video Card */}
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
        {/* Video Thumbnail - show first frame */}
        <video
          src={video.url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'size-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white',
              'transition-all duration-200',
              isHovered ? 'scale-105 bg-black/70' : 'scale-100'
            )}
          >
            <Play className="size-5 ml-0.5" fill="currentColor" />
          </div>
        </div>

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

        {/* Video Badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
          <Film className="size-2.5" />
          Video
        </div>

        {/* Duration & Resolution Badge */}
        <div className="absolute top-2 right-2 flex gap-1">
          {video.durationSeconds && (
            <div className="px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium tabular-nums">
              {video.durationSeconds}s
            </div>
          )}
          {video.resolution && (
            <div className="px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
              {video.resolution}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden bg-background border shadow-2xl rounded-3xl">
          <div className="flex flex-col md:flex-row max-h-[90vh]">
            {/* Video section */}
            <div className="flex-1 min-h-[300px] md:min-h-[450px] bg-black flex items-center justify-center">
              <video
                src={video.url}
                className="w-full h-full max-h-[50vh] md:max-h-[80vh] object-contain"
                controls
                autoPlay
                loop
              />
            </div>

            {/* Info section */}
            <div className="w-full md:w-72 flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l p-6 bg-background max-h-[40vh] md:max-h-none overflow-y-auto">
              <div className="flex-1 overflow-y-auto space-y-5">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">
                    Prompt
                  </h3>
                  {video.prompt ? (
                    <div className="group relative bg-muted/50 rounded-3xl p-3">
                      <p className="text-sm leading-relaxed pr-6 text-foreground/90">
                        {video.prompt}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-1">
                      Created
                    </h3>
                    <p className="text-sm">{formattedDate}</p>
                  </div>
                  {video.durationSeconds && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-1">
                        Duration
                      </h3>
                      <p className="text-sm tabular-nums">
                        {video.durationSeconds}s
                      </p>
                    </div>
                  )}
                  {video.aspectRatio && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-1">
                        Aspect Ratio
                      </h3>
                      <p className="text-sm">{video.aspectRatio}</p>
                    </div>
                  )}
                  {video.resolution && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-1">
                        Resolution
                      </h3>
                      <p className="text-sm">{video.resolution}</p>
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
                  Download Video
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
