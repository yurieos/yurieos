import Link from 'next/link'

import { FileQuestion, Home } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

export default function NoteNotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md animate-fade-in">
        {/* Icon container */}
        <div
          className={cn(
            'size-20 mx-auto mb-6 rounded-2xl',
            'bg-muted/50 border border-border/30',
            'flex items-center justify-center'
          )}
        >
          <FileQuestion className="size-10 text-muted-foreground/40" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold mb-3 tracking-tight">
          Note not found
        </h1>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed mb-8">
          The note you&apos;re looking for doesn&apos;t exist or you don&apos;t
          have access to it.
        </p>

        {/* Action */}
        <Button asChild size="lg" className="gap-2">
          <Link href="/notes">
            <Home className="size-4" />
            Back to Notes
          </Link>
        </Button>
      </div>
    </div>
  )
}
