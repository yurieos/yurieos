'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { FileText, Loader2, Plus, Sparkles, Star } from 'lucide-react'

import { createNote } from '@/lib/actions/notes'
import type { Note } from '@/lib/types/notes'
import { cn, listItemStyles } from '@/lib/utils'
import { formatRelativeTimeShort } from '@/lib/utils/format-time'
import { sortNotesByUpdated } from '@/lib/utils/notes-helpers'

import { Skeleton } from '@/components/ui/skeleton'

// ============================================
// Types
// ============================================

interface NotesListClientProps {
  notes: Note[]
  favorites: Note[]
}

// ============================================
// Note Item Component
// ============================================

function NoteItem({ note }: { note: Note }) {
  return (
    <a
      href={`/notes/${note.id}`}
      className={cn(listItemStyles.base, 'gap-3 group')}
    >
      <span className="text-xl shrink-0 leading-none select-none">
        {note.icon || <FileText className="size-5 text-muted-foreground/50" />}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            note.title ? 'text-foreground' : 'text-muted-foreground/60 italic'
          )}
        >
          {note.title || 'Untitled'}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {formatRelativeTimeShort(note.updatedAt)}
        </span>
      </div>
      {note.isFavorite && (
        <Star className="size-3.5 fill-amber-400/90 text-amber-400 shrink-0" />
      )}
    </a>
  )
}

// ============================================
// Skeleton Loading Component (with staggered animation)
// ============================================

function NoteItemSkeleton({ index, width }: { index: number; width: number }) {
  return (
    <div
      className={cn(listItemStyles.skeleton, 'gap-3 note-item-stagger')}
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: 0
      }}
    >
      <Skeleton className="size-5 rounded" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 rounded" style={{ width }} />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>
  )
}

export function NotesListSkeleton() {
  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-1">
        {[180, 140, 200, 160, 190].map((width, i) => (
          <NoteItemSkeleton key={i} index={i} width={width} />
        ))}
      </div>
    </div>
  )
}

// ============================================
// Empty State Component
// ============================================

function EmptyState({
  onCreateNote,
  isPending
}: {
  onCreateNote: () => void
  isPending: boolean
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pt-[8vh] px-6">
      <div className="text-center max-w-md">
        <p className="text-center heading-greeting mb-6">
          What will you write about?
        </p>
        <div className="relative mb-8 inline-block">
          <div className="size-20 mx-auto rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center shadow-sm border border-border/20">
            <span
              className="text-4xl select-none"
              role="img"
              aria-label="Notebook"
            >
              📝
            </span>
          </div>
          <div className="absolute -top-1 -right-1 size-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-3.5 text-primary/50" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Your notes will appear here. Create your first note to get started.
        </p>
        <button
          onClick={onCreateNote}
          disabled={isPending}
          className={cn(
            'pill-button pill-button-active',
            'h-10 px-6 gap-2 text-sm shadow-sm'
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Create your first note
        </button>
      </div>
    </div>
  )
}

// ============================================
// Notes List Client Component
// ============================================

export function NotesListClient({ notes, favorites }: NotesListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Merge favorites into notes and sort by update time
  const allNotes = sortNotesByUpdated([
    ...favorites.filter(f => !notes.some(n => n.id === f.id)),
    ...notes
  ])

  const handleCreateNote = () => {
    startTransition(async () => {
      const result = await createNote({})
      if (result.note) {
        router.push(`/notes/${result.note.id}`)
      }
    })
  }

  if (allNotes.length === 0) {
    return <EmptyState onCreateNote={handleCreateNote} isPending={isPending} />
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-0.5">Notes</h1>
          <p className="text-sm text-muted-foreground">
            {allNotes.length} {allNotes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <button
          onClick={handleCreateNote}
          disabled={isPending}
          className={cn(
            'pill-button pill-button-inactive',
            'text-sm gap-1.5 h-9 px-4'
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          <span>New</span>
        </button>
      </div>

      {/* Simple flat notes list */}
      <div className="space-y-0.5">
        {allNotes.map(note => (
          <NoteItem key={note.id} note={note} />
        ))}
      </div>
    </div>
  )
}
