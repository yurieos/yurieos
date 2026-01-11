/**
 * Notes Error Types
 * Error codes and messages for notes operations
 */

// ============================================
// Error Types & Messages
// ============================================

/**
 * Standard error codes for notes operations
 */
export const NotesErrorCode = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const

export type NotesErrorCode =
  (typeof NotesErrorCode)[keyof typeof NotesErrorCode]

/**
 * User-friendly error messages
 */
export const ErrorMessages: Record<NotesErrorCode, string> = {
  [NotesErrorCode.NOT_CONFIGURED]:
    'Notes are not available. Please configure Supabase.',
  [NotesErrorCode.AUTH_REQUIRED]: 'Please sign in to access your notes.',
  [NotesErrorCode.NOT_FOUND]: 'Note not found.',
  [NotesErrorCode.ACCESS_DENIED]:
    "You don't have permission to access this note.",
  [NotesErrorCode.VALIDATION_ERROR]: 'Invalid data provided.',
  [NotesErrorCode.CYCLE_DETECTED]:
    'Cannot move a note inside itself or its children.',
  [NotesErrorCode.OPERATION_FAILED]: 'Operation failed. Please try again.',
  [NotesErrorCode.NETWORK_ERROR]:
    'Network error. Please check your connection and try again.'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(
  code: NotesErrorCode,
  details?: string
): string {
  const baseMessage = ErrorMessages[code]
  return details ? `${baseMessage} ${details}` : baseMessage
}

/**
 * Handle Supabase errors and return user-friendly messages
 */
export function handleSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string }

    // Map common Supabase error codes to user-friendly messages
    switch (supabaseError.code) {
      case 'PGRST116': // Not found
        return getErrorMessage(NotesErrorCode.NOT_FOUND)
      case '42501': // Permission denied
      case 'PGRST301': // JWT expired
        return getErrorMessage(NotesErrorCode.ACCESS_DENIED)
      case '23505': // Unique violation
        return 'A note with this information already exists.'
      case '23503': // Foreign key violation
        return 'Referenced item does not exist.'
      default:
        console.error('Supabase error:', supabaseError)
        return getErrorMessage(NotesErrorCode.OPERATION_FAILED)
    }
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return getErrorMessage(NotesErrorCode.NETWORK_ERROR)
    }
    console.error('Error:', error.message)
  }

  return getErrorMessage(NotesErrorCode.OPERATION_FAILED)
}
