/**
 * Notes to Context Utility
 * Converts notes to structured text for AI context injection
 *
 * Leverages Gemini best practices for long context:
 * - XML-like tags for clear structure
 * - Query placement at end of prompt (handled by caller)
 * - Metadata included for context
 *
 * @see https://ai.google.dev/gemini-api/docs/long-context
 * @see https://ai.google.dev/gemini-api/docs/prompting-strategies
 */

/**
 * Note context item for formatting
 */
export interface NoteContextItem {
  id: string
  title: string
  icon: string | null
  content: string
  updatedAt: Date
}

/**
 * Lightweight note reference (for selection state)
 */
export interface NoteContextRef {
  id: string
  title: string
  icon: string | null
}

/** Characters per token estimate (Gemini uses ~4 chars/token) */
const CHARS_PER_TOKEN = 4

/** Maximum recommended tokens for notes context */
export const MAX_NOTES_CONTEXT_TOKENS = 100_000 // 100K tokens, well within 1M limit

/** Maximum number of notes that can be selected */
export const MAX_NOTES_SELECTION = 10

/**
 * Convert notes to structured XML context for Gemini
 *
 * Format optimized for Gemini's structured prompt handling:
 * - XML tags clearly delineate context boundaries
 * - Metadata (title, date) helps model understand recency/relevance
 * - Empty notes are filtered out
 *
 * @param notes - Array of notes with content
 * @returns Formatted context string or empty string if no content
 */
export function notesToContextText(notes: NoteContextItem[]): string {
  // Filter out notes with no content
  const notesWithContent = notes.filter(note => note.content.trim().length > 0)

  if (notesWithContent.length === 0) {
    return ''
  }

  const noteElements = notesWithContent.map(note => {
    const formattedDate = formatDateForContext(note.updatedAt)
    const titleAttr = escapeXmlAttribute(note.title || 'Untitled')
    const iconAttr = note.icon ? ` icon="${escapeXmlAttribute(note.icon)}"` : ''

    return `<note id="${note.id}" title="${titleAttr}" updated="${formattedDate}"${iconAttr}>
${note.content}
</note>`
  })

  return `<user_notes_context>
${noteElements.join('\n\n')}
</user_notes_context>`
}

/**
 * Estimate token count for notes context
 * Based on Gemini's ~4 characters per token ratio
 *
 * @see https://ai.google.dev/gemini-api/docs/tokens
 */
export function estimateTokenCount(notes: NoteContextItem[]): number {
  const contextText = notesToContextText(notes)
  return Math.ceil(contextText.length / CHARS_PER_TOKEN)
}

/**
 * Estimate token count from character count
 */
export function charsToTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

/**
 * Check if notes context exceeds recommended limit
 */
export function isContextTooLarge(notes: NoteContextItem[]): boolean {
  return estimateTokenCount(notes) > MAX_NOTES_CONTEXT_TOKENS
}

/**
 * Format a date for context display
 * Uses ISO date format for clarity
 */
function formatDateForContext(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Escape special characters for XML attributes
 */
function escapeXmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Format token count for display (human-readable)
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `~${tokens}`
  }
  return `~${(tokens / 1000).toFixed(1)}K`
}

/**
 * Calculate total character count from notes
 */
export function getTotalCharCount(notes: NoteContextItem[]): number {
  return notes.reduce((sum, note) => sum + note.content.length, 0)
}

// ============================================
// Parsing utilities (for display)
// ============================================

/**
 * Parsed note reference from context text
 */
export interface ParsedNoteRef {
  id: string
  title: string
  icon: string | null
  updated: string
  content: string
}

/**
 * Result of parsing notes context from a message
 */
export interface ParsedNotesContext {
  /** Whether the message contains notes context */
  hasNotesContext: boolean
  /** Parsed note references (metadata only) */
  notes: ParsedNoteRef[]
  /** The user's actual message (without notes context) */
  userMessage: string
  /** The raw notes context XML (for AI) */
  rawContext: string
}

/**
 * Parse notes context from a message text
 * Extracts note metadata and separates user's actual query
 *
 * @param messageText - Full message text that may contain notes context
 * @returns Parsed context with note refs and clean user message
 */
export function parseNotesContext(messageText: string): ParsedNotesContext {
  // Check if message starts with notes context
  const contextStartTag = '<user_notes_context>'
  const contextEndTag = '</user_notes_context>'

  if (!messageText.startsWith(contextStartTag)) {
    return {
      hasNotesContext: false,
      notes: [],
      userMessage: messageText,
      rawContext: ''
    }
  }

  const endIndex = messageText.indexOf(contextEndTag)
  if (endIndex === -1) {
    return {
      hasNotesContext: false,
      notes: [],
      userMessage: messageText,
      rawContext: ''
    }
  }

  // Extract the raw context
  const rawContext = messageText.slice(0, endIndex + contextEndTag.length)

  // Get user message (everything after the context, trimmed)
  const userMessage = messageText.slice(endIndex + contextEndTag.length).trim()

  // Parse note metadata and content from the context
  const notes: ParsedNoteRef[] = []
  // Match note tags with their content (multiline)
  const noteRegex =
    /<note\s+id="([^"]+)"\s+title="([^"]+)"\s+updated="([^"]+)"(?:\s+icon="([^"]*)")?>\n([\s\S]*?)\n<\/note>/g

  let match
  while ((match = noteRegex.exec(rawContext)) !== null) {
    notes.push({
      id: match[1],
      title: unescapeXmlAttribute(match[2]),
      updated: match[3],
      icon: match[4] ? unescapeXmlAttribute(match[4]) : null,
      content: match[5] || ''
    })
  }

  return {
    hasNotesContext: true,
    notes,
    userMessage,
    rawContext
  }
}

/**
 * Unescape XML attribute values
 */
function unescapeXmlAttribute(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
