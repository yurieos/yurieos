/**
 * Notes Types
 * Type definitions for the note-taking feature
 */

// ============================================
// Block Types
// ============================================

/**
 * Block types supported by the BlockNote editor
 */
export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletListItem'
  | 'numberedListItem'
  | 'checkListItem'
  | 'table'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'codeBlock'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'toggle'
  | 'embed'

// ============================================
// Note Types
// ============================================

/**
 * Note/page metadata
 */
export interface Note {
  id: string
  userId: string
  parentId: string | null
  title: string
  icon: string | null
  coverImage: string | null
  isFavorite: boolean
  isArchived: boolean
  isFolder: boolean
  position: number
  createdAt: Date
  updatedAt: Date
  children?: Note[]
}

/**
 * Note with blocks (for editor)
 */
export interface NoteWithBlocks extends Note {
  blocks: NoteBlock[]
}

/**
 * Note creation input
 */
export interface CreateNoteInput {
  parentId?: string | null
  title?: string
  icon?: string | null
  isFolder?: boolean
}

/**
 * Note update input
 */
export interface UpdateNoteInput {
  title?: string
  icon?: string | null
  coverImage?: string | null
  isFavorite?: boolean
  isArchived?: boolean
  isFolder?: boolean
  position?: number
  parentId?: string | null
}

// ============================================
// Block Types
// ============================================

/**
 * Note block (content unit)
 */
export interface NoteBlock {
  id: string
  noteId: string
  type: BlockType
  content: Record<string, unknown>
  position: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Block creation input
 */
export interface CreateBlockInput {
  type: BlockType
  content: Record<string, unknown>
  position?: number
}

/**
 * Block update input
 */
export interface UpdateBlockInput {
  type?: BlockType
  content?: Record<string, unknown>
  position?: number
}

// ============================================
// API Response Types
// ============================================

/**
 * Generic API response
 */
export interface NotesAPIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Paginated notes response
 */
export interface PaginatedNotesResponse {
  notes: Note[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * Notes tree response (hierarchical)
 */
export interface NotesTreeResponse {
  notes: Note[]
  favorites: Note[]
  archived: Note[]
}

// ============================================
// Database Row Types (Supabase)
// ============================================

/**
 * Note row from Supabase
 */
export interface NoteRow {
  id: string
  user_id: string
  parent_id: string | null
  title: string
  icon: string | null
  cover_image: string | null
  is_favorite: boolean
  is_archived: boolean
  is_folder: boolean
  position: number
  created_at: string
  updated_at: string
}

/**
 * Note block row from Supabase
 */
export interface NoteBlockRow {
  id: string
  note_id: string
  type: string
  content: Record<string, unknown>
  position: number
  created_at: string
  updated_at: string
}

// ============================================
// Transformer Functions
// ============================================

/**
 * Transform NoteRow to Note
 */
export function transformNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    title: row.title,
    icon: row.icon,
    coverImage: row.cover_image,
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
    isFolder: row.is_folder ?? false,
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

/**
 * Transform NoteBlockRow to NoteBlock
 */
export function transformNoteBlockRow(row: NoteBlockRow): NoteBlock {
  return {
    id: row.id,
    noteId: row.note_id,
    type: row.type as BlockType,
    content: row.content,
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}
