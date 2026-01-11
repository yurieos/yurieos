'use client'

import { FileText, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { NoteContextRef } from './use-notes-context'

// ============================================
// Types
// ============================================

interface NotesContextPreviewProps {
  /** Selected notes to display */
  notes: NoteContextRef[]
  /** Callback to remove a note */
  onRemove: (noteId: string) => void
  /** Additional className */
  className?: string
}

// ============================================
// Component
// ============================================

/**
 * Notes Context Preview
 *
 * Displays selected notes as compact badges in the chat input area.
 * Each badge shows the note icon/title with a remove button.
 */
export function NotesContextPreview({
  notes,
  onRemove,
  className
}: NotesContextPreviewProps) {
  if (notes.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {notes.map(note => (
        <NoteContextBadge key={note.id} note={note} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ============================================
// Badge Component
// ============================================

interface NoteContextBadgeProps {
  note: NoteContextRef
  onRemove: (noteId: string) => void
}

function NoteContextBadge({ note, onRemove }: NoteContextBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md',
        'bg-primary/10 text-primary text-xs',
        'border border-primary/20',
        'group'
      )}
    >
      {/* Note icon or default */}
      {note.icon ? (
        <span className="text-sm leading-none">{note.icon}</span>
      ) : (
        <FileText className="size-3 shrink-0" />
      )}

      {/* Note title (truncated) */}
      <span className="max-w-[120px] truncate font-medium">
        {note.title || 'Untitled'}
      </span>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(note.id)}
        className={cn(
          'ml-0.5 p-0.5 rounded-sm',
          'hover:bg-primary/20 transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-primary/50'
        )}
        aria-label={`Remove ${note.title || 'note'} from context`}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
