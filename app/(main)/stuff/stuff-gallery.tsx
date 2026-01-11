'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'

import { ImageOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteImage, getUserImages } from '@/lib/actions/images'
import type { SavedImage } from '@/lib/schema/image'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { EmptyState } from '@/components/empty-state'
import { SavedImageCard } from '@/components/saved-image-card'

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}

export function StuffGallery() {
  const [images, setImages] = useState<SavedImage[]>([])
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Initial load
  useEffect(() => {
    async function loadImages() {
      setIsLoading(true)
      const result = await getUserImages(1)

      if ('error' in result) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      setImages(result.images)
      setNextPage(result.nextPage)
      setIsLoading(false)
    }

    loadImages()
  }, [])

  // Load more images
  const handleLoadMore = useCallback(async () => {
    if (!nextPage || isLoadingMore) return

    setIsLoadingMore(true)
    const result = await getUserImages(nextPage)

    if ('error' in result) {
      toast.error(result.error)
      setIsLoadingMore(false)
      return
    }

    setImages(prev => [...prev, ...result.images])
    setNextPage(result.nextPage)
    setIsLoadingMore(false)
  }, [nextPage, isLoadingMore])

  // Delete image
  const handleDelete = useCallback(async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id))

    startTransition(async () => {
      const result = await deleteImage(id)

      if ('error' in result) {
        toast.error(result.error)
        setDeletingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== id))
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success('Image deleted')
    })
  }, [])

  // Loading state
  if (isLoading) {
    return <GallerySkeleton />
  }

  // Empty state - using shared EmptyState component
  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No saved images yet"
        description="Generate images and save them here to build your collection."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Start creating</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {images.map(image => (
          <SavedImageCard
            key={image.id}
            image={image}
            onDelete={handleDelete}
            isDeleting={deletingIds.has(image.id)}
          />
        ))}
      </div>

      {/* Load More Button */}
      {nextPage && (
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
