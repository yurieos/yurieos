'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { FileText, Plus, Search, Star } from 'lucide-react'

import type { Note } from '@/lib/types/notes'
import { cn } from '@/lib/utils'
import { formatRelativeTimeShort } from '@/lib/utils/format-time'
import { sortNotesByUpdated } from '@/lib/utils/notes-helpers'

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

// ============================================
// Types
// ============================================

interface QuickSwitcherProps {
  notes: Note[]
  favorites: Note[]
  onCreateNote?: () => void
}

// ============================================
// Quick Switcher Component - Apple Notes Style
// ============================================

export function QuickSwitcher({
  notes,
  favorites,
  onCreateNote
}: QuickSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Simple flat list sorted by update time
  const allNotes = useMemo(() => {
    const combined = [
      ...favorites.filter(f => !notes.some(n => n.id === f.id)),
      ...notes
    ]
    return sortNotesByUpdated(combined)
  }, [notes, favorites])

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onCreateNote?.()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onCreateNote])

  const handleSelect = useCallback(
    (noteId: string) => {
      router.push(`/notes/${noteId}`)
      setOpen(false)
    },
    [router]
  )

  const handleCreateNote = useCallback(() => {
    onCreateNote?.()
    setOpen(false)
  }, [onCreateNote])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) setSearchQuery('')
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <DialogTitle className="sr-only">Quick Switcher</DialogTitle>
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
                <button
                  onClick={handleCreateNote}
                  className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="size-3" />
                  Create new note
                </button>
              </div>
            </CommandEmpty>

            {/* Simple flat notes list */}
            <CommandGroup heading="Notes">
              {allNotes.map(note => (
                <CommandItem
                  key={note.id}
                  value={`${note.title}-${note.id}`}
                  onSelect={() => handleSelect(note.id)}
                  className="flex items-center gap-2 py-2.5"
                >
                  {note.icon ? (
                    <span className="text-base">{note.icon}</span>
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">
                    {note.title || 'Untitled'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {formatRelativeTimeShort(note.updatedAt)}
                  </span>
                  {note.isFavorite && (
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Create action */}
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={handleCreateNote}
                className="flex items-center gap-2 py-2.5"
              >
                <Plus className="size-4 text-muted-foreground" />
                <span>Create new note</span>
                <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ⌘N
                </kbd>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-background border rounded text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-background border rounded text-[10px]">
                ↵
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-background border rounded text-[10px]">
                esc
              </kbd>
              close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
