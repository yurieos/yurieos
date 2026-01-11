/**
 * Notes utility helpers
 * Shared across notes components for consistent note manipulation
 */

import type { Note } from '@/lib/types/notes'

// ============================================
// Note Tree Operations
// ============================================

/**
 * Flatten a nested notes tree into a single array
 * Preserves parent-child relationships via parentId
 */
export function flattenNotes(notes: Note[]): Note[] {
  const result: Note[] = []

  function traverse(noteList: Note[]) {
    for (const note of noteList) {
      result.push(note)
      if (note.children && note.children.length > 0) {
        traverse(note.children)
      }
    }
  }

  traverse(notes)
  return result
}

/**
 * Find a note by ID in a nested tree structure
 */
export function findNoteById(notes: Note[], id: string): Note | null {
  for (const note of notes) {
    if (note.id === id) return note
    if (note.children) {
      const found = findNoteById(note.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Find a note's parent in the tree
 */
export function findNoteParent(notes: Note[], noteId: string): Note | null {
  for (const note of notes) {
    if (note.children?.some(child => child.id === noteId)) {
      return note
    }
    if (note.children) {
      const found = findNoteParent(note.children, noteId)
      if (found) return found
    }
  }
  return null
}

/**
 * Get the path from root to a specific note
 */
export function getNotePath(notes: Note[], noteId: string): Note[] {
  const path: Note[] = []

  function findPath(noteList: Note[], targetId: string): boolean {
    for (const note of noteList) {
      if (note.id === targetId) {
        path.push(note)
        return true
      }
      if (note.children) {
        if (findPath(note.children, targetId)) {
          path.unshift(note)
          return true
        }
      }
    }
    return false
  }

  findPath(notes, noteId)
  return path
}

// ============================================
// Note Filtering
// ============================================

/**
 * Filter notes by search query (recursive)
 * Includes notes if they match or if any of their children match
 */
export function filterNotesByQuery(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes

  const lowerQuery = query.toLowerCase()
  const result: Note[] = []

  for (const note of notes) {
    const matchesTitle = note.title.toLowerCase().includes(lowerQuery)
    const matchesIcon = note.icon?.includes(lowerQuery) || false

    // Check children
    const filteredChildren = note.children
      ? filterNotesByQuery(note.children, query)
      : undefined

    // Include note if it matches or has matching children
    if (
      matchesTitle ||
      matchesIcon ||
      (filteredChildren && filteredChildren.length > 0)
    ) {
      result.push({
        ...note,
        children:
          filteredChildren && filteredChildren.length > 0
            ? filteredChildren
            : note.children
      })
    }
  }

  return result
}

/**
 * Filter notes that match a predicate (non-recursive)
 */
export function filterNotes(
  notes: Note[],
  predicate: (note: Note) => boolean
): Note[] {
  return notes.filter(predicate)
}

// ============================================
// Note Deduplication
// ============================================

/**
 * Remove duplicate notes by ID
 */
export function deduplicateNotes(notes: Note[]): Note[] {
  const seen = new Set<string>()
  return notes.filter(note => {
    if (seen.has(note.id)) return false
    seen.add(note.id)
    return true
  })
}

/**
 * Merge multiple note arrays and deduplicate
 */
export function mergeAndDeduplicateNotes(...noteArrays: Note[][]): Note[] {
  const all = noteArrays.flat()
  return deduplicateNotes(all)
}

// ============================================
// Note Sorting
// ============================================

/**
 * Sort notes by position
 */
export function sortNotesByPosition(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => a.position - b.position)
}

/**
 * Sort notes by updated date (most recent first)
 */
export function sortNotesByUpdated(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/**
 * Sort notes by created date (most recent first)
 */
export function sortNotesByCreated(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Sort notes by title (alphabetically)
 */
export function sortNotesByTitle(notes: Note[]): Note[] {
  return [...notes].sort((a, b) =>
    (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
  )
}

// ============================================
// Note Categorization
// ============================================

/**
 * Separate folders from regular notes
 */
export function separateFoldersAndNotes(notes: Note[]): {
  folders: Note[]
  regularNotes: Note[]
} {
  const folders: Note[] = []
  const regularNotes: Note[] = []

  for (const note of notes) {
    if (note.isFolder) {
      folders.push(note)
    } else {
      regularNotes.push(note)
    }
  }

  return { folders, regularNotes }
}

/**
 * Get favorites from a note list
 */
export function getFavorites(notes: Note[]): Note[] {
  return flattenNotes(notes).filter(note => note.isFavorite && !note.isFolder)
}

/**
 * Get root-level notes (no parent)
 */
export function getRootNotes(notes: Note[]): Note[] {
  return notes.filter(note => !note.parentId)
}

// ============================================
// Note Counting
// ============================================

/**
 * Count total notes including nested children
 */
export function countAllNotes(notes: Note[]): number {
  let count = 0

  function countRecursive(noteList: Note[]) {
    for (const note of noteList) {
      count++
      if (note.children) {
        countRecursive(note.children)
      }
    }
  }

  countRecursive(notes)
  return count
}

/**
 * Count notes matching a predicate
 */
export function countNotesMatching(
  notes: Note[],
  predicate: (note: Note) => boolean
): number {
  return flattenNotes(notes).filter(predicate).length
}

// ============================================
// Note Validation
// ============================================

/**
 * Check if a note ID exists in the tree
 */
export function noteExists(notes: Note[], noteId: string): boolean {
  return findNoteById(notes, noteId) !== null
}

/**
 * Check if moving a note would create a cycle (moving under its descendant)
 */
export function wouldCreateCycle(
  notes: Note[],
  noteId: string,
  newParentId: string
): boolean {
  if (noteId === newParentId) return true

  const note = findNoteById(notes, noteId)
  if (!note?.children) return false

  // Check if newParentId is a descendant of noteId
  const descendants = flattenNotes(note.children)
  return descendants.some(d => d.id === newParentId)
}
