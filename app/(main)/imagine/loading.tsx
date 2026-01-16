import { Skeleton } from '@/components/ui/skeleton'

export default function ImagineLoading() {
  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* Form */}
      <div className="space-y-6">
        <Skeleton className="w-full h-24 rounded-3xl" />

        <div className="flex items-center gap-2">
          <Skeleton className="size-10 rounded-3xl" />
          <Skeleton className="h-3 w-36" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-7 w-10 rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-6 w-8 rounded-full" />
            ))}
          </div>
        </div>

        <Skeleton className="w-full h-10 rounded-full" />
      </div>
    </div>
  )
}
