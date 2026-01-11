import Link from 'next/link'

import { FileQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { EmptyState } from '@/components/empty-state'

export default function NoteNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Note not found"
      description="The note you're looking for doesn't exist or you don't have access to it."
      action={
        <Button asChild size="lg">
          <Link href="/notes">Back to Notes</Link>
        </Button>
      }
    />
  )
}
