'use client'

import { useCallback, useOptimistic, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

import {
  archiveNote,
  createNote,
  restoreNote,
  updateNote
} from '@/lib/actions/notes'
import type { Note, UpdateNoteInput } from '@/lib/types/notes'
import { findNoteById } from '@/lib/utils/notes-helpers'

// ============================================
// Types
// ============================================

type OptimisticAction =
  | { type: 'create'; note: Note }
  | { type: 'update'; noteId: string; updates: Partial<Note> }
  | { type: 'archive'; noteId: string }
  | { type: 'restore'; note: Note }

interface UseOptimisticNotesOptions {
  notes: Note[]
  favorites: Note[]
  onNotesChange?: (notes: Note[], favorites: Note[]) => void
}

interface UseOptimisticNotesReturn {
  optimisticNotes: Note[]
  optimisticFavorites: Note[]
  isPending: boolean
  createNoteOptimistic: () => Promise<Note | null>
  updateNoteOptimistic: (
    noteId: string,
    updates: UpdateNoteInput
  ) => Promise<void>
  archiveNoteOptimistic: (noteId: string, showUndo?: boolean) => Promise<void>
  toggleFavoriteOptimistic: (
    noteId: string,
    currentFavorite: boolean
  ) => Promise<void>
}

// ============================================
// Reducer for optimistic updates
// ============================================

function notesReducer(
  state: { notes: Note[]; favorites: Note[] },
  action: OptimisticAction
): { notes: Note[]; favorites: Note[] } {
  switch (action.type) {
    case 'create': {
      const { note } = action
      if (note.isFavorite) {
        return {
          ...state,
          favorites: [note, ...state.favorites]
        }
      }
      return {
        ...state,
        notes: [note, ...state.notes]
      }
    }

    case 'update': {
      const { noteId, updates } = action

      const updateInList = (notes: Note[]): Note[] =>
        notes.map(note => (note.id === noteId ? { ...note, ...updates } : note))

      let newNotes = updateInList(state.notes)
      let newFavorites = updateInList(state.favorites)

      // Handle favorite toggle
      if (updates.isFavorite !== undefined) {
        const findNote = (notes: Note[]): Note | undefined =>
          notes.find(note => note.id === noteId)

        const updatedNote = findNote(newNotes) || findNote(newFavorites)

        if (updatedNote) {
          if (updates.isFavorite) {
            // Add to favorites if not already there
            if (!newFavorites.find(n => n.id === noteId)) {
              newFavorites = [
                { ...updatedNote, isFavorite: true },
                ...newFavorites
              ]
            }
          } else {
            // Remove from favorites
            newFavorites = newFavorites.filter(n => n.id !== noteId)
          }
        }
      }

      return { notes: newNotes, favorites: newFavorites }
    }

    case 'archive': {
      const { noteId } = action
      return {
        notes: state.notes.filter(note => note.id !== noteId),
        favorites: state.favorites.filter(note => note.id !== noteId)
      }
    }

    case 'restore': {
      const { note } = action
      if (note.isFavorite) {
        return {
          ...state,
          favorites: [note, ...state.favorites]
        }
      }
      return {
        ...state,
        notes: [note, ...state.notes]
      }
    }

    default:
      return state
  }
}

// ============================================
// Custom Hook for Optimistic Notes
// ============================================

export function useOptimisticNotes({
  notes,
  favorites,
  onNotesChange
}: UseOptimisticNotesOptions): UseOptimisticNotesReturn {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Store archived notes for undo capability
  const archivedNotesRef = useRef<Map<string, Note>>(new Map())

  const [optimisticState, addOptimisticUpdate] = useOptimistic(
    { notes, favorites },
    notesReducer
  )

  // Create note with optimistic update
  const createNoteOptimistic = useCallback(async (): Promise<Note | null> => {
    // Create temporary optimistic note
    const tempNote: Note = {
      id: `temp-${Date.now()}`,
      userId: 'temp',
      parentId: null,
      title: 'Untitled',
      icon: null,
      coverImage: null,
      isFavorite: false,
      isArchived: false,
      isFolder: false,
      position: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Optimistically add the note
    startTransition(() => {
      addOptimisticUpdate({ type: 'create', note: tempNote })
    })

    try {
      const result = await createNote({})

      if (result.error) {
        toast.error('Failed to create note', {
          description: result.error
        })
        router.refresh()
        return null
      }

      if (result.note) {
        router.push(`/notes/${result.note.id}`)
        return result.note
      }

      return null
    } catch {
      toast.error('Failed to create note')
      router.refresh()
      return null
    }
  }, [router, addOptimisticUpdate])

  // Update note with optimistic update
  const updateNoteOptimistic = useCallback(
    async (noteId: string, updates: UpdateNoteInput): Promise<void> => {
      // Optimistically update the note
      startTransition(() => {
        addOptimisticUpdate({
          type: 'update',
          noteId,
          updates: updates as Partial<Note>
        })
      })

      try {
        const result = await updateNote(noteId, updates)

        if (result.error) {
          toast.error('Failed to update note', {
            description: result.error
          })
          router.refresh()
          return
        }

        onNotesChange?.(optimisticState.notes, optimisticState.favorites)
      } catch {
        toast.error('Failed to update note')
        router.refresh()
      }
    },
    [router, addOptimisticUpdate, onNotesChange, optimisticState]
  )

  // Archive note with optimistic update and undo capability
  const archiveNoteOptimistic = useCallback(
    async (noteId: string, showUndo: boolean = true): Promise<void> => {
      // Find the note before archiving for potential undo
      const noteToArchive =
        findNoteById(notes, noteId) || findNoteById(favorites, noteId)

      // Optimistically remove the note
      startTransition(() => {
        addOptimisticUpdate({ type: 'archive', noteId })
      })

      try {
        const result = await archiveNote(noteId)

        if (result.error) {
          toast.error('Failed to archive note', {
            description: result.error
          })
          router.refresh()
          return
        }

        // Store the archived note for potential undo
        if (noteToArchive) {
          archivedNotesRef.current.set(noteId, noteToArchive)
        }

        // Show toast with undo option
        if (showUndo && noteToArchive) {
          toast.success('Note moved to trash', {
            action: {
              label: 'Undo',
              onClick: async () => {
                // Optimistically restore
                startTransition(() => {
                  const cachedNote = archivedNotesRef.current.get(noteId)
                  if (cachedNote) {
                    addOptimisticUpdate({
                      type: 'restore',
                      note: { ...cachedNote, isArchived: false }
                    })
                  }
                })

                // Actually restore
                const restoreResult = await restoreNote(noteId)
                if (restoreResult.error) {
                  toast.error('Failed to restore note')
                  router.refresh()
                } else {
                  toast.success('Note restored')
                  archivedNotesRef.current.delete(noteId)
                }
              }
            }
          })
        } else {
          toast.success('Note moved to trash')
        }
      } catch {
        toast.error('Failed to archive note')
        router.refresh()
      }
    },
    [router, addOptimisticUpdate, notes, favorites]
  )

  // Toggle favorite with optimistic update
  const toggleFavoriteOptimistic = useCallback(
    async (noteId: string, currentFavorite: boolean): Promise<void> => {
      const newFavorite = !currentFavorite

      // Optimistically toggle favorite
      startTransition(() => {
        addOptimisticUpdate({
          type: 'update',
          noteId,
          updates: { isFavorite: newFavorite }
        })
      })

      try {
        const result = await updateNote(noteId, { isFavorite: newFavorite })

        if (result.error) {
          toast.error('Failed to update favorite', {
            description: result.error
          })
          router.refresh()
          return
        }

        toast.success(
          newFavorite ? 'Added to favorites' : 'Removed from favorites'
        )
      } catch {
        toast.error('Failed to update favorite')
        router.refresh()
      }
    },
    [router, addOptimisticUpdate]
  )

  return {
    optimisticNotes: optimisticState.notes,
    optimisticFavorites: optimisticState.favorites,
    isPending,
    createNoteOptimistic,
    updateNoteOptimistic,
    archiveNoteOptimistic,
    toggleFavoriteOptimistic
  }
}
