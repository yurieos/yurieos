'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { toast } from 'sonner'

import {
  getNotesForContext,
  type NoteContextData
} from '@/lib/actions/notes'
import {
  estimateTokenCount,
  MAX_NOTES_SELECTION,
  type NoteContextItem,
  type NoteContextRef,
  notesToContextText
} from '@/lib/utils/notes-to-context'

// ============================================
// Types
// ============================================

export interface UseNotesContextReturn {
  // State
  selectedNotes: NoteContextRef[]
  isLoading: boolean
  hasNotesContext: boolean
  selectedCount: number

  // Actions
  addNote: (note: NoteContextRef) => void
  removeNote: (noteId: string) => void
  toggleNote: (note: NoteContextRef) => void
  clearNotes: () => void
  isNoteSelected: (noteId: string) => boolean

  // For submission - fetches content and formats
  getNotesContextText: () => Promise<string>

  // Token estimation (uses cached content if available)
  getEstimatedTokens: () => number
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for managing notes context in chat
 *
 * Design decisions:
 * - Lightweight selection state (only id, title, icon)
 * - Lazy content fetch on submission (not on selection)
 * - Content caching to avoid duplicate fetches
 * - Max selection limit enforced
 */
export function useNotesContext(): UseNotesContextReturn {
  // Selection state (lightweight - no content)
  const [selectedNotes, setSelectedNotes] = useState<NoteContextRef[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Cache for fetched content (persists across renders)
  const contentCacheRef = useRef<Map<string, NoteContextData>>(new Map())

  // Derived state
  const hasNotesContext = selectedNotes.length > 0
  const selectedCount = selectedNotes.length

  // Check if note is selected
  const isNoteSelected = useCallback(
    (noteId: string) => selectedNotes.some(n => n.id === noteId),
    [selectedNotes]
  )

  // Add a note to selection
  const addNote = useCallback((note: NoteContextRef) => {
    setSelectedNotes(prev => {
      // Already selected
      if (prev.some(n => n.id === note.id)) {
        return prev
      }
      // At max limit
      if (prev.length >= MAX_NOTES_SELECTION) {
        toast.error(`Maximum ${MAX_NOTES_SELECTION} notes allowed`)
        return prev
      }
      return [...prev, note]
    })
  }, [])

  // Remove a note from selection
  const removeNote = useCallback((noteId: string) => {
    setSelectedNotes(prev => prev.filter(n => n.id !== noteId))
  }, [])

  // Toggle note selection
  const toggleNote = useCallback(
    (note: NoteContextRef) => {
      if (isNoteSelected(note.id)) {
        removeNote(note.id)
      } else {
        addNote(note)
      }
    },
    [isNoteSelected, removeNote, addNote]
  )

  // Clear all selections
  const clearNotes = useCallback(() => {
    setSelectedNotes([])
  }, [])

  // Get notes context text for submission
  // Fetches content for notes not in cache, then formats
  const getNotesContextText = useCallback(async (): Promise<string> => {
    if (selectedNotes.length === 0) {
      return ''
    }

    setIsLoading(true)

    try {
      const cache = contentCacheRef.current
      const selectedIds = selectedNotes.map(n => n.id)

      // Find notes that need fetching
      const uncachedIds = selectedIds.filter(id => !cache.has(id))

      // Fetch uncached notes
      if (uncachedIds.length > 0) {
        const { notes: fetchedNotes, error } =
          await getNotesForContext(uncachedIds)

        if (error) {
          toast.error('Failed to load note content')
          console.error('getNotesForContext error:', error)
          // Continue with cached notes only
        }

        // Add to cache
        for (const note of fetchedNotes) {
          cache.set(note.id, note)
        }
      }

      // Build content array from cache (in selection order)
      const notesWithContent: NoteContextItem[] = selectedIds
        .map(id => cache.get(id))
        .filter((n): n is NoteContextData => n !== undefined)

      // Format and return
      return notesToContextText(notesWithContent)
    } catch (error) {
      console.error('Error getting notes context:', error)
      toast.error('Failed to prepare notes context')
      return ''
    } finally {
      setIsLoading(false)
    }
  }, [selectedNotes])

  // Estimate token count (uses cache if available)
  const getEstimatedTokens = useCallback((): number => {
    if (selectedNotes.length === 0) {
      return 0
    }

    const cache = contentCacheRef.current
    const selectedIds = selectedNotes.map(n => n.id)

    // Get cached notes
    const cachedNotes: NoteContextItem[] = selectedIds
      .map(id => cache.get(id))
      .filter((n): n is NoteContextData => n !== undefined)

    // If all notes are cached, use actual content
    if (cachedNotes.length === selectedIds.length) {
      return estimateTokenCount(cachedNotes)
    }

    // Otherwise, estimate based on average note size (~500 tokens)
    const ESTIMATED_TOKENS_PER_NOTE = 500
    return selectedNotes.length * ESTIMATED_TOKENS_PER_NOTE
  }, [selectedNotes])

  return useMemo(
    () => ({
      selectedNotes,
      isLoading,
      hasNotesContext,
      selectedCount,
      addNote,
      removeNote,
      toggleNote,
      clearNotes,
      isNoteSelected,
      getNotesContextText,
      getEstimatedTokens
    }),
    [
      selectedNotes,
      isLoading,
      hasNotesContext,
      selectedCount,
      addNote,
      removeNote,
      toggleNote,
      clearNotes,
      isNoteSelected,
      getNotesContextText,
      getEstimatedTokens
    ]
  )
}

export type { NoteContextItem,NoteContextRef }
