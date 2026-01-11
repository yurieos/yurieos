'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import {
  CreateNoteSchema,
  SaveBlocksSchema,
  UpdateNoteSchema
} from '@/lib/schema/notes'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import {
  type Note,
  type NoteBlock,
  type NoteBlockRow,
  type NoteRow,
  type NoteWithBlocks,
  transformNoteBlockRow,
  transformNoteRow
} from '@/lib/types/notes'
import {
  getErrorMessage,
  handleSupabaseError,
  NotesErrorCode
} from '@/lib/types/notes-errors'

// ============================================
// Notes CRUD Operations
// ============================================

/**
 * Get all notes for the current user (flat list)
 */
export async function getNotes(): Promise<{
  notes: Note[]
  favorites: Note[]
  error?: string
}> {
  if (!isSupabaseConfigured()) {
    return {
      notes: [],
      favorites: [],
      error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED)
    }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        notes: [],
        favorites: [],
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()

    // Get all non-archived notes
    const { data: notesData, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .eq('is_folder', false)
      .order('updated_at', { ascending: false })

    if (error) {
      return {
        notes: [],
        favorites: [],
        error: handleSupabaseError(error)
      }
    }

    const allNotes = (notesData as NoteRow[]).map(transformNoteRow)

    // Separate favorites
    const favorites = allNotes.filter(n => n.isFavorite)
    const notes = allNotes.filter(n => !n.isFavorite)

    return { notes, favorites }
  } catch (error) {
    return {
      notes: [],
      favorites: [],
      error: handleSupabaseError(error)
    }
  }
}

/**
 * Get archived notes
 */
export async function getArchivedNotes(): Promise<{
  notes: Note[]
  error?: string
}> {
  if (!isSupabaseConfigured()) {
    return { notes: [], error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED) }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return { notes: [], error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED) }
    }

    const supabase = await createClient()

    const { data: notesData, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false })

    if (error) {
      return { notes: [], error: handleSupabaseError(error) }
    }

    const notes = (notesData as NoteRow[]).map(transformNoteRow)
    return { notes }
  } catch (error) {
    return { notes: [], error: handleSupabaseError(error) }
  }
}

/**
 * Get a single note with its blocks
 */
export async function getNote(noteId: string): Promise<{
  note: NoteWithBlocks | null
  error?: string
}> {
  if (!isSupabaseConfigured()) {
    return { note: null, error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED) }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        note: null,
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()

    // Get note
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()

    if (noteError || !noteData) {
      return {
        note: null,
        error: noteError
          ? handleSupabaseError(noteError)
          : getErrorMessage(NotesErrorCode.NOT_FOUND)
      }
    }

    // Get blocks
    const { data: blocksData, error: blocksError } = await supabase
      .from('note_blocks')
      .select('*')
      .eq('note_id', noteId)
      .order('position', { ascending: true })

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError)
    }

    const note = transformNoteRow(noteData as NoteRow)
    const blocks =
      (blocksData as NoteBlockRow[] | null)?.map(transformNoteBlockRow) ?? []

    return { note: { ...note, blocks } }
  } catch (error) {
    return { note: null, error: handleSupabaseError(error) }
  }
}

/**
 * Create a new note
 */
export async function createNote(
  input: unknown
): Promise<{ note: Note | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { note: null, error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED) }
  }

  const validation = CreateNoteSchema.safeParse(input)
  if (!validation.success) {
    return {
      note: null,
      error: getErrorMessage(
        NotesErrorCode.VALIDATION_ERROR,
        validation.error.errors[0].message
      )
    }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        note: null,
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()
    const { title, icon } = validation.data

    const { data: noteData, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        parent_id: null,
        title: title ?? 'Untitled',
        icon: icon ?? null,
        is_folder: false,
        position: 0
      })
      .select()
      .single()

    if (error) {
      return { note: null, error: handleSupabaseError(error) }
    }

    const note = transformNoteRow(noteData as NoteRow)
    revalidatePath('/notes')

    return { note }
  } catch (error) {
    return { note: null, error: handleSupabaseError(error) }
  }
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  input: unknown
): Promise<{ note: Note | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { note: null, error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED) }
  }

  const validation = UpdateNoteSchema.safeParse(input)
  if (!validation.success) {
    return {
      note: null,
      error: getErrorMessage(
        NotesErrorCode.VALIDATION_ERROR,
        validation.error.errors[0].message
      )
    }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        note: null,
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()
    const updates: Record<string, unknown> = {}

    if (validation.data.title !== undefined)
      updates.title = validation.data.title
    if (validation.data.icon !== undefined) updates.icon = validation.data.icon
    if (validation.data.isFavorite !== undefined)
      updates.is_favorite = validation.data.isFavorite
    if (validation.data.isArchived !== undefined)
      updates.is_archived = validation.data.isArchived

    const { data: noteData, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return { note: null, error: handleSupabaseError(error) }
    }

    const note = transformNoteRow(noteData as NoteRow)
    revalidatePath('/notes')
    revalidatePath(`/notes/${noteId}`)

    return { note }
  } catch (error) {
    return { note: null, error: handleSupabaseError(error) }
  }
}

/**
 * Archive a note (soft delete)
 */
export async function archiveNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  return updateNote(noteId, { isArchived: true }).then(result => ({
    success: !!result.note,
    error: result.error
  }))
}

/**
 * Restore an archived note
 */
export async function restoreNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  return updateNote(noteId, { isArchived: false }).then(result => ({
    success: !!result.note,
    error: result.error
  }))
}

/**
 * Permanently delete a note
 */
export async function deleteNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED)
    }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        success: false,
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: handleSupabaseError(error) }
    }

    revalidatePath('/notes')
    return { success: true }
  } catch (error) {
    return { success: false, error: handleSupabaseError(error) }
  }
}

// ============================================
// Blocks Operations
// ============================================

/**
 * Save blocks for a note (bulk upsert)
 */
export async function saveBlocks(
  noteId: string,
  input: unknown
): Promise<{ blocks: NoteBlock[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { blocks: [], error: getErrorMessage(NotesErrorCode.NOT_CONFIGURED) }
  }

  const validation = SaveBlocksSchema.safeParse(input)
  if (!validation.success) {
    return {
      blocks: [],
      error: getErrorMessage(
        NotesErrorCode.VALIDATION_ERROR,
        validation.error.errors[0].message
      )
    }
  }

  try {
    const userId = await getCurrentUserId()
    if (userId === 'anonymous') {
      return {
        blocks: [],
        error: getErrorMessage(NotesErrorCode.AUTH_REQUIRED)
      }
    }

    const supabase = await createClient()

    // Verify note ownership
    const { data: noteData } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()

    if (!noteData) {
      return {
        blocks: [],
        error: getErrorMessage(NotesErrorCode.ACCESS_DENIED)
      }
    }

    const { blocks } = validation.data

    // Delete existing blocks
    await supabase.from('note_blocks').delete().eq('note_id', noteId)

    // Insert new blocks
    if (blocks.length > 0) {
      const blocksToInsert = blocks.map((block, index) => ({
        id: block.id || undefined,
        note_id: noteId,
        type: block.type,
        content: block.content,
        position: block.position ?? index
      }))

      const { data: insertedBlocks, error: insertError } = await supabase
        .from('note_blocks')
        .insert(blocksToInsert)
        .select()

      if (insertError) {
        return { blocks: [], error: handleSupabaseError(insertError) }
      }

      const savedBlocks = (insertedBlocks as NoteBlockRow[]).map(
        transformNoteBlockRow
      )

      // Update note's updated_at
      await supabase
        .from('notes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', noteId)

      return { blocks: savedBlocks }
    }

    return { blocks: [] }
  } catch (error) {
    return { blocks: [], error: handleSupabaseError(error) }
  }
}
