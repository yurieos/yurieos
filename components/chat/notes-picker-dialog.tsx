'use client'

import { useCallback, useMemo, useState } from 'react'

import { Check, FileText, Search, Star } from 'lucide-react'

import type { Note } from '@/lib/types/notes'
import { cn } from '@/lib/utils'
import { formatRelativeTimeShort } from '@/lib/utils/format-time'
import { sortNotesByUpdated } from '@/lib/utils/notes-helpers'
import {
  formatTokenCount,
  MAX_NOTES_SELECTION
} from '@/lib/utils/notes-to-context'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import type { NoteContextRef } from './use-notes-context'

// ============================================
// Types
// ============================================

interface NotesPickerDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** All available notes */
  notes: Note[]
  /** Favorite notes */
  favorites: Note[]
  /** Currently selected note IDs */
  selectedIds: string[]
  /** Toggle note selection */
  onToggleNote: (note: NoteContextRef) => void
  /** Clear all selections */
  onClearAll: () => void
  /** Estimated token count */
  estimatedTokens: number
}

// ============================================
// Component
// ============================================

/**
 * Notes Picker Dialog
 *
 * Command dialog for selecting notes to add as AI context.
 * Features:
 * - Multi-select with checkboxes
 * - Search/filter by title
 * - Favorites section
 * - Token estimation
 * - Selection limit indicator
 */
export function NotesPickerDialog({
  open,
  onOpenChange,
  notes,
  favorites,
  selectedIds,
  onToggleNote,
  onClearAll,
  estimatedTokens
}: NotesPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Combine and sort notes
  const allNotes = useMemo(() => {
    const combined = [
      ...favorites.filter(f => !notes.some(n => n.id === f.id)),
      ...notes
    ]
    return sortNotesByUpdated(combined)
  }, [notes, favorites])

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allNotes

    const query = searchQuery.toLowerCase()
    return allNotes.filter(
      note =>
        note.title.toLowerCase().includes(query) ||
        note.icon?.toLowerCase().includes(query)
    )
  }, [allNotes, searchQuery])

  // Separate favorites and regular notes
  const { favoritesFiltered, regularFiltered } = useMemo(() => {
    const favs = filteredNotes.filter(n => n.isFavorite)
    const regular = filteredNotes.filter(n => !n.isFavorite)
    return { favoritesFiltered: favs, regularFiltered: regular }
  }, [filteredNotes])

  // Check if at selection limit
  const atLimit = selectedIds.length >= MAX_NOTES_SELECTION

  // Handle note toggle
  const handleToggle = useCallback(
    (note: Note) => {
      onToggleNote({
        id: note.id,
        title: note.title,
        icon: note.icon
      })
    },
    [onToggleNote]
  )

  // Handle dialog close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen)
      if (!newOpen) {
        setSearchQuery('')
      }
    },
    [onOpenChange]
  )

  // Render a note item
  const renderNoteItem = (note: Note) => {
    const isSelected = selectedIds.includes(note.id)
    const isDisabled = atLimit && !isSelected

    return (
      <CommandItem
        key={note.id}
        value={`${note.title}-${note.id}`}
        onSelect={() => !isDisabled && handleToggle(note)}
        className={cn(
          'flex items-center gap-2 p-2 cursor-pointer rounded-md',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isDisabled}
      >
        {/* Checkbox indicator */}
        <div
          className={cn(
            'size-4 rounded border flex items-center justify-center shrink-0',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40'
          )}
        >
          {isSelected && <Check className="size-3 text-primary-foreground" />}
        </div>

        {/* Note icon */}
        {note.icon ? (
          <span className="text-base shrink-0">{note.icon}</span>
        ) : (
          <FileText className="size-4 text-muted-foreground shrink-0" />
        )}

        {/* Note title */}
        <span className="flex-1 truncate">{note.title || 'Untitled'}</span>

        {/* Updated time */}
        <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
          {formatRelativeTimeShort(note.updatedAt)}
        </span>

        {/* Favorite indicator */}
        {note.isFavorite && (
          <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
        )}
      </CommandItem>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">Select Notes for Context</DialogTitle>
        <Command className="rounded-lg border-none">
          <CommandInput
            placeholder="Search notes..."
            className="h-12"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>
              <div className="flex flex-col items-center py-6">
                <Search className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No notes found</p>
              </div>
            </CommandEmpty>

            {/* Favorites section */}
            {favoritesFiltered.length > 0 && (
              <CommandGroup heading="Favorites" className="p-0 [&_[cmdk-group-heading]]:px-3">
                {favoritesFiltered.map(renderNoteItem)}
              </CommandGroup>
            )}

            {/* Separator */}
            {favoritesFiltered.length > 0 && regularFiltered.length > 0 && (
              <CommandSeparator className="mx-0" />
            )}

            {/* All notes section */}
            {regularFiltered.length > 0 && (
              <CommandGroup heading="Notes" className="p-0 [&_[cmdk-group-heading]]:px-3">
                {regularFiltered.map(renderNoteItem)}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer with selection info */}
          <div className="border-t border-border bg-muted/30 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                {selectedIds.length} / {MAX_NOTES_SELECTION} selected
              </span>
              {selectedIds.length > 0 && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>{formatTokenCount(estimatedTokens)} tokens</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
