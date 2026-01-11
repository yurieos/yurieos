import { Skeleton } from './ui/skeleton'

function SkeletonLine({ width }: { width: string }) {
  return <Skeleton className="h-4 rounded" style={{ width }} />
}

function UserMessageSkeleton() {
  return (
    <div className="flex justify-end mb-6">
      <div className="bg-muted/50 rounded-2xl px-4 py-3 max-w-[80%]">
        <Skeleton className="h-4 w-48 rounded" />
      </div>
    </div>
  )
}

function AssistantMessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 mb-8">
      {/* Paragraph lines with varying widths */}
      <div className="flex flex-col gap-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="75%" />
      </div>

      {/* Second paragraph */}
      <div className="flex flex-col gap-2 mt-2">
        <SkeletonLine width="100%" />
        <SkeletonLine width="92%" />
        <SkeletonLine width="60%" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="size-7 rounded" />
        <Skeleton className="size-7 rounded" />
      </div>
    </div>
  )
}

export function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-8">
      <UserMessageSkeleton />
      <AssistantMessageSkeleton />
    </div>
  )
}
