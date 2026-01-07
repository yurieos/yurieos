'use client'

import { Skeleton } from './ui/skeleton'

export const DefaultSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 py-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-full" />
    </div>
  )
}
