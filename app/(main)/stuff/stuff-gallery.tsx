'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'

import { Film, Image as ImageIcon, ImageOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteImage, getUserImages } from '@/lib/actions/images'
import { deleteVideo, getUserVideos } from '@/lib/actions/videos'
import type { SavedImage } from '@/lib/schema/image'
import type { SavedVideo } from '@/lib/schema/video'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { EmptyState } from '@/components/empty-state'
import { SavedImageCard } from '@/components/saved-image-card'
import { SavedVideoCard } from '@/components/saved-video-card'

// ============================================
// Types
// ============================================

type MediaFilter = 'all' | 'images' | 'videos'

// ============================================
// Skeleton Component
// ============================================

function GallerySkeleton() {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-full rounded-3xl break-inside-avoid mb-4 animate-pulse"
          style={{
            height: `${[280, 380, 320, 420, 240, 360][i % 6]}px`
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export function StuffGallery() {
  // State for images
  const [images, setImages] = useState<SavedImage[]>([])
  const [imagesNextPage, setImagesNextPage] = useState<number | null>(null)
  const [isLoadingImages, setIsLoadingImages] = useState(true)
  const [isLoadingMoreImages, setIsLoadingMoreImages] = useState(false)
  const [deletingImageIds, setDeletingImageIds] = useState<Set<string>>(
    new Set()
  )

  // State for videos
  const [videos, setVideos] = useState<SavedVideo[]>([])
  const [videosNextPage, setVideosNextPage] = useState<number | null>(null)
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false)
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(
    new Set()
  )

  // Filter state
  const [filter, setFilter] = useState<MediaFilter>('all')

  const [isPending, startTransition] = useTransition()

  // Initial load - fetch both images and videos
  useEffect(() => {
    async function loadMedia() {
      // Load images
      setIsLoadingImages(true)
      const imagesResult = await getUserImages(1)
      if ('error' in imagesResult) {
        toast.error(imagesResult.error)
      } else {
        setImages(imagesResult.images)
        setImagesNextPage(imagesResult.nextPage)
      }
      setIsLoadingImages(false)

      // Load videos
      setIsLoadingVideos(true)
      const videosResult = await getUserVideos(1)
      if ('error' in videosResult) {
        toast.error(videosResult.error)
      } else {
        setVideos(videosResult.videos)
        setVideosNextPage(videosResult.nextPage)
      }
      setIsLoadingVideos(false)
    }

    loadMedia()
  }, [])

  // Load more images
  const handleLoadMoreImages = useCallback(async () => {
    if (!imagesNextPage || isLoadingMoreImages) return

    setIsLoadingMoreImages(true)
    const result = await getUserImages(imagesNextPage)

    if ('error' in result) {
      toast.error(result.error)
      setIsLoadingMoreImages(false)
      return
    }

    setImages(prev => [...prev, ...result.images])
    setImagesNextPage(result.nextPage)
    setIsLoadingMoreImages(false)
  }, [imagesNextPage, isLoadingMoreImages])

  // Load more videos
  const handleLoadMoreVideos = useCallback(async () => {
    if (!videosNextPage || isLoadingMoreVideos) return

    setIsLoadingMoreVideos(true)
    const result = await getUserVideos(videosNextPage)

    if ('error' in result) {
      toast.error(result.error)
      setIsLoadingMoreVideos(false)
      return
    }

    setVideos(prev => [...prev, ...result.videos])
    setVideosNextPage(result.nextPage)
    setIsLoadingMoreVideos(false)
  }, [videosNextPage, isLoadingMoreVideos])

  // Delete image
  const handleDeleteImage = useCallback(async (id: string) => {
    setDeletingImageIds(prev => new Set(prev).add(id))

    startTransition(async () => {
      const result = await deleteImage(id)

      if ('error' in result) {
        toast.error(result.error)
        setDeletingImageIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }

      setImages(prev => prev.filter(img => img.id !== id))
      setDeletingImageIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success('Image deleted')
    })
  }, [])

  // Delete video
  const handleDeleteVideo = useCallback(async (id: string) => {
    setDeletingVideoIds(prev => new Set(prev).add(id))

    startTransition(async () => {
      const result = await deleteVideo(id)

      if ('error' in result) {
        toast.error(result.error)
        setDeletingVideoIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }

      setVideos(prev => prev.filter(vid => vid.id !== id))
      setDeletingVideoIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success('Video deleted')
    })
  }, [])

  // Handle load more based on current filter (must be before any early returns)
  const handleLoadMore = useCallback(async () => {
    if (filter === 'images') {
      await handleLoadMoreImages()
    } else if (filter === 'videos') {
      await handleLoadMoreVideos()
    } else {
      // Load more of both
      await Promise.all([handleLoadMoreImages(), handleLoadMoreVideos()])
    }
  }, [filter, handleLoadMoreImages, handleLoadMoreVideos])

  // Loading state
  const isLoading = isLoadingImages || isLoadingVideos

  if (isLoading) {
    return <GallerySkeleton />
  }

  // Determine what to show based on filter
  const showImages = filter === 'all' || filter === 'images'
  const showVideos = filter === 'all' || filter === 'videos'
  const hasImages = images.length > 0
  const hasVideos = videos.length > 0
  const hasAnyMedia = hasImages || hasVideos

  // Determine if we can load more
  const canLoadMoreImages = showImages && imagesNextPage !== null
  const canLoadMoreVideos = showVideos && videosNextPage !== null
  const canLoadMore = canLoadMoreImages || canLoadMoreVideos
  const isLoadingMore = isLoadingMoreImages || isLoadingMoreVideos

  // Empty state
  if (!hasAnyMedia) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No saved media yet"
        description="Generate images or videos and save them here to build your collection."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/imagine">Start creating</Link>
          </Button>
        }
      />
    )
  }

  // Filtered empty states
  if (filter === 'images' && !hasImages) {
    return (
      <>
        <FilterTabs
          filter={filter}
          setFilter={setFilter}
          imageCount={images.length}
          videoCount={videos.length}
        />
        <EmptyState
          icon={ImageOff}
          title="No saved images"
          description="Generate images and save them to see them here."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/imagine">Create images</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (filter === 'videos' && !hasVideos) {
    return (
      <>
        <FilterTabs
          filter={filter}
          setFilter={setFilter}
          imageCount={images.length}
          videoCount={videos.length}
        />
        <EmptyState
          icon={Film}
          title="No saved videos"
          description="Generate videos and save them to see them here."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/imagine">Create videos</Link>
            </Button>
          }
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Tabs */}
      <FilterTabs
        filter={filter}
        setFilter={setFilter}
        imageCount={images.length}
        videoCount={videos.length}
      />

      {/* Gallery Grid (Masonry Layout) */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
        {/* Show videos first if showing videos */}
        {showVideos &&
          videos.map(video => (
            <SavedVideoCard
              key={video.id}
              video={video}
              onDelete={handleDeleteVideo}
              isDeleting={deletingVideoIds.has(video.id)}
            />
          ))}

        {/* Show images */}
        {showImages &&
          images.map(image => (
            <SavedImageCard
              key={image.id}
              image={image}
              onDelete={handleDeleteImage}
              isDeleting={deletingImageIds.has(image.id)}
            />
          ))}
      </div>

      {/* Load More Button */}
      {canLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore || isPending}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Filter Tabs Component
// ============================================

interface FilterTabsProps {
  filter: MediaFilter
  setFilter: (filter: MediaFilter) => void
  imageCount: number
  videoCount: number
}

function FilterTabs({
  filter,
  setFilter,
  imageCount,
  videoCount
}: FilterTabsProps) {
  const totalCount = imageCount + videoCount

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 w-fit">
      <button
        type="button"
        onClick={() => setFilter('all')}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 text-sm rounded-full transition-all',
          filter === 'all'
            ? 'bg-background text-foreground shadow-sm font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        All
        <span
          className={cn(
            'text-xs tabular-nums',
            filter === 'all' ? 'text-foreground/70' : 'text-muted-foreground/70'
          )}
        >
          {totalCount}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setFilter('images')}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 text-sm rounded-full transition-all',
          filter === 'images'
            ? 'bg-background text-foreground shadow-sm font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ImageIcon className="size-3.5" />
        Images
        <span
          className={cn(
            'text-xs tabular-nums',
            filter === 'images'
              ? 'text-foreground/70'
              : 'text-muted-foreground/70'
          )}
        >
          {imageCount}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setFilter('videos')}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 text-sm rounded-full transition-all',
          filter === 'videos'
            ? 'bg-background text-foreground shadow-sm font-medium'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Film className="size-3.5" />
        Videos
        <span
          className={cn(
            'text-xs tabular-nums',
            filter === 'videos'
              ? 'text-foreground/70'
              : 'text-muted-foreground/70'
          )}
        >
          {videoCount}
        </span>
      </button>
    </div>
  )
}
