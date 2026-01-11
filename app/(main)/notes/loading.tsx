import { cn } from '@/lib/utils'

import { Skeleton } from '@/components/ui/skeleton'

// Skeleton item with staggered animation
function NoteItemSkeleton({ index, width }: { index: number; width: number }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'note-item-stagger'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: 0
      }}
    >
      {/* Icon */}
      <Skeleton className="size-[18px] rounded-md" />
      {/* Title */}
      <Skeleton className="h-4 flex-1 rounded" style={{ maxWidth: width }} />
    </div>
  )
}

// Section header skeleton
function SectionHeaderSkeleton({ width }: { width: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 mb-1">
      <Skeleton className="size-3.5 rounded" />
      <Skeleton className="h-2.5 rounded" style={{ width }} />
    </div>
  )
}

export default function NotesLoading() {
  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-[70px] rounded-md" />
      </div>

      {/* Favorites section */}
      <section className="mb-6">
        <SectionHeaderSkeleton width={72} />
        <div className="space-y-0.5">
          {[160, 200].map((width, i) => (
            <NoteItemSkeleton key={i} index={i} width={width} />
          ))}
        </div>
      </section>

      {/* All Notes section */}
      <section>
        <SectionHeaderSkeleton width={64} />
        <div className="space-y-0.5">
          {[180, 140, 220, 160, 190].map((width, i) => (
            <NoteItemSkeleton key={i} index={i + 2} width={width} />
          ))}
        </div>
      </section>

      {/* Bottom hint skeleton */}
      <div className="mt-auto pt-8 flex items-center justify-center gap-1.5">
        <Skeleton className="h-3 w-10 rounded" />
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
    </div>
  )
}
