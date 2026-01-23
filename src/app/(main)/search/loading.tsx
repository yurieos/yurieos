import { DefaultSkeleton } from '@/components/default-skeleton'

export default function Loading() {
  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="mx-auto w-full max-w-3xl px-4">
          <DefaultSkeleton />
        </div>
      </div>
    </div>
  )
}
