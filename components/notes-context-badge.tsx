'use client'

import { useState } from 'react'

import { FileText } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ParsedNoteRef } from '@/lib/utils/notes-to-context'

import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

// ============================================
// Types
// ============================================

interface NotesContextBadgeProps {
  /** Parsed note references with content */
  notes: ParsedNoteRef[]
  /** Additional className */
  className?: string
}

// ============================================
// Component
// ============================================

/**
 * Notes Context Badge
 *
 * Displays a compact badge showing notes attached to a user message.
 * Clicking opens a dialog with full note contents.
 */
export function NotesContextBadge({ notes, className }: NotesContextBadgeProps) {
  const [selectedNote, setSelectedNote] = useState<ParsedNoteRef | null>(null)

  if (notes.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-1.5 mb-2', className)}>
        {notes.map(note => (
          <button
            key={note.id}
            type="button"
            onClick={() => setSelectedNote(note)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
              'bg-primary/10 text-primary text-xs',
              'border border-primary/20',
              'hover:bg-primary/20 transition-colors cursor-pointer'
            )}
            title={`Click to view note: ${note.title}`}
          >
            {/* Note icon or default */}
            {note.icon ? (
              <span className="text-sm leading-none">{note.icon}</span>
            ) : (
              <FileText className="size-3 shrink-0" />
            )}

            {/* Note title (truncated) */}
            <span className="max-w-[150px] truncate font-medium">
              {note.title || 'Untitled'}
            </span>
          </button>
        ))}
      </div>

      {/* Note content dialog */}
      <Dialog
        open={selectedNote !== null}
        onOpenChange={open => !open && setSelectedNote(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedNote?.icon ? (
                <span className="text-xl">{selectedNote.icon}</span>
              ) : (
                <FileText className="size-5" />
              )}
              <span className="truncate">
                {selectedNote?.title || 'Untitled'}
              </span>
            </DialogTitle>
            {selectedNote?.updated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {selectedNote.updated}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 mt-4 overflow-y-auto">
            <div className="pr-4">
              {selectedNote?.content ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedNote.content}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  This note has no content.
                </p>
              )}
            </div>
          </div>

          {/* Navigation for multiple notes */}
          {notes.length > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-xs text-muted-foreground">
                {notes.findIndex(n => n.id === selectedNote?.id) + 1} of{' '}
                {notes.length} notes
              </span>
              <div className="flex gap-1">
                {notes.map((note, idx) => (
                  <Button
                    key={note.id}
                    variant={selectedNote?.id === note.id ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setSelectedNote(note)}
                  >
                    {note.icon || idx + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
