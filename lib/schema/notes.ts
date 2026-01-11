/**
 * Notes Zod Schemas
 * Validation schemas for the note-taking feature (Apple Notes style)
 */

import { z } from 'zod'

// ============================================
// Block Type Schema
// ============================================

export const BlockTypeSchema = z.enum([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
  'callout',
  'quote',
  'divider',
  'toggle',
  'embed'
])

// ============================================
// Note Schemas
// ============================================

export const CreateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  icon: z.string().max(50).nullable().optional()
})

export const UpdateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  icon: z.string().max(50).nullable().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional()
})

// ============================================
// Block Schemas
// ============================================

export const BlockContentSchema = z.record(z.unknown())

export const CreateBlockSchema = z.object({
  type: BlockTypeSchema,
  content: BlockContentSchema,
  position: z.number().int().min(0).optional()
})

export const UpdateBlockSchema = z.object({
  type: BlockTypeSchema.optional(),
  content: BlockContentSchema.optional(),
  position: z.number().int().min(0).optional()
})

export const SaveBlocksSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().uuid().optional(),
      type: BlockTypeSchema,
      content: BlockContentSchema,
      position: z.number().int().min(0)
    })
  )
})

// ============================================
// API Request Schemas
// ============================================

export const GetNotesQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional(),
  favoritesOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional()
})

export const GetNoteParamsSchema = z.object({
  id: z.string().uuid()
})

// ============================================
// Type Exports from Schemas
// ============================================

export type BlockType = z.infer<typeof BlockTypeSchema>
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>
export type CreateBlockInput = z.infer<typeof CreateBlockSchema>
export type UpdateBlockInput = z.infer<typeof UpdateBlockSchema>
export type SaveBlocksInput = z.infer<typeof SaveBlocksSchema>
export type GetNotesQuery = z.infer<typeof GetNotesQuerySchema>

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate create note input
 */
export function validateCreateNote(
  data: unknown
):
  | { success: true; data: CreateNoteInput }
  | { success: false; error: string } {
  const result = CreateNoteSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) }
  }
  return { success: true, data: result.data }
}

/**
 * Validate update note input
 */
export function validateUpdateNote(
  data: unknown
):
  | { success: true; data: UpdateNoteInput }
  | { success: false; error: string } {
  const result = UpdateNoteSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) }
  }
  return { success: true, data: result.data }
}

/**
 * Validate save blocks input
 */
export function validateSaveBlocks(
  data: unknown
):
  | { success: true; data: SaveBlocksInput }
  | { success: false; error: string } {
  const result = SaveBlocksSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) }
  }
  return { success: true, data: result.data }
}

/**
 * Format Zod error for user-friendly message
 */
function formatZodError(error: z.ZodError): string {
  return error.errors
    .map(e => {
      const path = e.path.join('.')
      return path ? `${path}: ${e.message}` : e.message
    })
    .join('; ')
}
