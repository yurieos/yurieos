import { Skeleton } from '@/components/ui/skeleton'

export default function StuffLoading() {
  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
