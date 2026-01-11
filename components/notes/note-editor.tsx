'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTheme } from 'next-themes'

import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  PartialBlock
} from '@blocknote/core'
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  DeleteLinkButton,
  EditLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  GridSuggestionMenuController,
  LinkToolbar,
  LinkToolbarController,
  NestBlockButton,
  OpenLinkButton,
  SuggestionMenuController,
  TextAlignButton,
  UnnestBlockButton,
  useCreateBlockNote
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { toast } from 'sonner'

import { uploadFileForBlockNote } from '@/lib/actions/note-uploads'
import type { NoteBlock } from '@/lib/types/notes'

import { CodeBlock } from './blocks'
import { SlashMenu } from './slash-menu'

import '@blocknote/shadcn/style.css'

// ============================================
// Custom Vintage Paper Themes
// ============================================

const lightTheme = {
  colors: {
    editor: {
      text: '#4a4239',
      background: 'transparent'
    },
    menu: {
      text: '#4a4239',
      background: '#fdfbf7'
    },
    tooltip: {
      text: '#4a4239',
      background: '#fdfbf7'
    },
    hovered: {
      text: '#4a4239',
      background: '#c9bda8'
    },
    selected: {
      text: '#4a4239',
      background: '#c9bda8'
    },
    disabled: {
      text: '#6b5d4d',
      background: '#e3dcd0'
    },
    shadow: '#d9d0c3',
    border: '#d9d0c3',
    sideMenu: '#6b5d4d',
    highlights: {
      gray: { text: '#6b5d4d', background: '#e3dcd0' },
      brown: { text: '#6b4423', background: '#e8d5c4' },
      red: { text: '#9b2c2c', background: '#fed7d7' },
      orange: { text: '#c05621', background: '#feebc8' },
      yellow: { text: '#975a16', background: '#fefcbf' },
      green: { text: '#276749', background: '#c6f6d5' },
      blue: { text: '#2b6cb0', background: '#bee3f8' },
      purple: { text: '#6b46c1', background: '#e9d8fd' },
      pink: { text: '#b83280', background: '#fed7e2' }
    }
  },
  borderRadius: 6,
  fontFamily: 'inherit'
}

const darkTheme = {
  colors: {
    editor: {
      text: '#e3dcd0',
      background: 'transparent'
    },
    menu: {
      text: '#e3dcd0',
      background: '#302a25'
    },
    tooltip: {
      text: '#e3dcd0',
      background: '#302a25'
    },
    hovered: {
      text: '#e3dcd0',
      background: '#453d36'
    },
    selected: {
      text: '#e3dcd0',
      background: '#453d36'
    },
    disabled: {
      text: '#b8a892',
      background: '#3d3530'
    },
    shadow: '#1a1714',
    border: '#3d3530',
    sideMenu: '#b8a892',
    highlights: {
      gray: { text: '#b8a892', background: '#3d3530' },
      brown: { text: '#d4a574', background: '#4a3728' },
      red: { text: '#fc8181', background: '#4a2020' },
      orange: { text: '#f6ad55', background: '#4a2c10' },
      yellow: { text: '#ecc94b', background: '#4a3d10' },
      green: { text: '#68d391', background: '#1c3d2a' },
      blue: { text: '#63b3ed', background: '#1a3650' },
      purple: { text: '#b794f4', background: '#382952' },
      pink: { text: '#f687b3', background: '#4a1d33' }
    }
  },
  borderRadius: 6,
  fontFamily: 'inherit'
}

// ============================================
// Custom Schema with default blocks
// ============================================

// Create schema with custom code block that matches AI chat codeblock styling
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // Override default codeBlock with custom syntax-highlighted version
    codeBlock: CodeBlock()
  }
})

// ============================================
// Types
// ============================================

interface NoteEditorProps {
  noteId: string
  initialBlocks?: NoteBlock[]
  onSave?: (blocks: PartialBlock[]) => void | Promise<void>
  readOnly?: boolean
  autoSaveDelay?: number
}

/**
 * Ref handle for NoteEditor - exposes methods to manipulate editor content
 */
export interface NoteEditorHandle {
  /** Insert text content at the current cursor position */
  insertTextAtCursor: (text: string) => void
  /** Replace the current selection with new text */
  replaceSelection: (text: string) => void
  /** Insert a new block after the current block */
  insertBlockAfterCurrent: (content: string, type?: string) => void
  /** Get the current selection text */
  getSelectionText: () => string
  /** Get all document text */
  getDocumentText: () => string
  /** Force save the current content */
  forceSave: () => Promise<void>
  /** Get the BlockNote editor instance (use with caution - internal API) */

  getEditor: () => BlockNoteEditor<any, any, any> | null
}

// ============================================
// Note Editor Component
// ============================================

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  function NoteEditor(
    { noteId, initialBlocks, onSave, readOnly = false, autoSaveDelay = 1000 },
    ref
  ) {
    const { resolvedTheme } = useTheme()
    const [isSaving, setIsSaving] = useState(false)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedRef = useRef<string>('')
    const pendingBlocksRef = useRef<PartialBlock[] | null>(null)

    // Convert NoteBlock[] to BlockNote format
    const initialContent = useMemo(() => {
      if (!initialBlocks || initialBlocks.length === 0) {
        return undefined
      }

      return initialBlocks.map(block => ({
        id: block.id,
        type: block.type as keyof typeof defaultBlockSpecs,
        props: block.content.props as Record<string, unknown> | undefined,
        content: block.content.content as unknown[] | undefined,
        children: block.content.children as unknown[] | undefined
      })) as PartialBlock[]
    }, [initialBlocks])

    // Upload file handler for BlockNote
    const handleUploadFile = useCallback(
      async (file: File): Promise<string> => {
        try {
          toast.loading('Uploading file...', { id: 'file-upload' })
          const url = await uploadFileForBlockNote(noteId, file)
          toast.success('File uploaded successfully', { id: 'file-upload' })
          return url
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to upload file'
          toast.error(message, { id: 'file-upload' })
          throw error
        }
      },
      [noteId]
    )

    // Create editor instance
    const editor = useCreateBlockNote({
      schema,
      initialContent,
      uploadFile: handleUploadFile
    })

    // Save function
    const saveContent = useCallback(
      async (blocks: PartialBlock[]) => {
        if (!onSave) return

        // Check if content actually changed
        const contentHash = JSON.stringify(blocks)
        if (contentHash === lastSavedRef.current) {
          return
        }

        setIsSaving(true)
        try {
          await onSave(blocks)
          lastSavedRef.current = contentHash
        } catch (error) {
          console.error('Error saving blocks:', error)
          toast.error('Failed to save changes')
        } finally {
          setIsSaving(false)
        }
      },
      [onSave]
    )

    // Force save function exposed via ref
    const forceSave = useCallback(async () => {
      if (!editor || !onSave) return

      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      await saveContent(editor.document)
    }, [editor, onSave, saveContent])

    // Expose editor methods via ref
    useImperativeHandle(
      ref,
      () => ({
        insertTextAtCursor: (text: string) => {
          if (!editor) return

          try {
            // Get the current text cursor position
            const selection = editor.getTextCursorPosition()
            if (!selection) return

            // Insert text at cursor by creating a new paragraph block after current
            const currentBlock = selection.block

            // Parse text into blocks - split by double newlines for paragraphs
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim())

            if (paragraphs.length === 0) return

            // Create blocks for each paragraph
            const newBlocks: PartialBlock[] = paragraphs.map(p => ({
              type: 'paragraph' as const,
              content: [{ type: 'text' as const, text: p.trim(), styles: {} }]
            }))

            // Insert after current block
            editor.insertBlocks(newBlocks, currentBlock, 'after')
          } catch (err) {
            console.warn('Failed to insert text at cursor:', err)
          }
        },

        replaceSelection: (text: string) => {
          if (!editor) return

          try {
            const selection = editor.getSelection()
            if (selection) {
              // If there's a selection, we need to handle it differently
              // For now, insert at cursor position
              const cursorPosition = editor.getTextCursorPosition()
              if (cursorPosition) {
                const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
                const newBlocks: PartialBlock[] = paragraphs.map(p => ({
                  type: 'paragraph' as const,
                  content: [
                    { type: 'text' as const, text: p.trim(), styles: {} }
                  ]
                }))
                editor.insertBlocks(newBlocks, cursorPosition.block, 'after')
              }
            } else {
              // No selection, just insert at cursor
              const cursorPosition = editor.getTextCursorPosition()
              if (cursorPosition) {
                const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
                const newBlocks: PartialBlock[] = paragraphs.map(p => ({
                  type: 'paragraph' as const,
                  content: [
                    { type: 'text' as const, text: p.trim(), styles: {} }
                  ]
                }))
                editor.insertBlocks(newBlocks, cursorPosition.block, 'after')
              }
            }
          } catch (err) {
            console.warn('Failed to replace selection:', err)
          }
        },

        insertBlockAfterCurrent: (content: string, type = 'paragraph') => {
          if (!editor) return

          try {
            const cursorPosition = editor.getTextCursorPosition()
            if (!cursorPosition) return

            // Parse content based on type
            let newBlock: PartialBlock

            if (type === 'bulletListItem' || content.startsWith('- ')) {
              // Parse bullet list
              const items = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[-*]\s*/, '').trim())

              const listBlocks: PartialBlock[] = items.map(item => ({
                type: 'bulletListItem' as const,
                content: [{ type: 'text' as const, text: item, styles: {} }]
              }))

              editor.insertBlocks(listBlocks, cursorPosition.block, 'after')
              return
            } else if (type === 'numberedListItem' || /^\d+\./.test(content)) {
              // Parse numbered list
              const items = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^\d+\.\s*/, '').trim())

              const listBlocks: PartialBlock[] = items.map(item => ({
                type: 'numberedListItem' as const,
                content: [{ type: 'text' as const, text: item, styles: {} }]
              }))

              editor.insertBlocks(listBlocks, cursorPosition.block, 'after')
              return
            } else if (type === 'checkListItem' || content.includes('[ ]')) {
              // Parse checklist
              const items = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => ({
                  text: line.replace(/^[-*]?\s*\[[ x]\]\s*/i, '').trim(),
                  checked: /\[x\]/i.test(line)
                }))

              const listBlocks: PartialBlock[] = items.map(item => ({
                type: 'checkListItem' as const,
                props: { checked: item.checked },
                content: [
                  { type: 'text' as const, text: item.text, styles: {} }
                ]
              }))

              editor.insertBlocks(listBlocks, cursorPosition.block, 'after')
              return
            } else {
              // Default paragraph
              newBlock = {
                type: 'paragraph' as const,
                content: [
                  { type: 'text' as const, text: content.trim(), styles: {} }
                ]
              }
            }

            editor.insertBlocks([newBlock], cursorPosition.block, 'after')
          } catch (err) {
            console.warn('Failed to insert block:', err)
          }
        },

        getSelectionText: () => {
          if (!editor) return ''

          try {
            const selection = editor.getSelection()
            if (!selection) return ''

            // Get text from selected blocks
            const blocks = selection.blocks
            return blocks
              .map(block => {
                if (Array.isArray(block.content)) {
                  return block.content
                    .map((item: unknown) => {
                      if (
                        typeof item === 'object' &&
                        item !== null &&
                        'text' in item
                      ) {
                        return (item as { text: string }).text
                      }
                      return ''
                    })
                    .join('')
                }
                return ''
              })
              .join('\n')
          } catch {
            return ''
          }
        },

        getDocumentText: () => {
          if (!editor) return ''
          try {
            return getPlainTextFromBlocks(editor.document)
          } catch {
            return ''
          }
        },

        forceSave,

        getEditor: () => editor
      }),
      [editor, forceSave]
    )

    // Get slash menu items - compact without descriptions
    const getSlashMenuItems = useCallback(
      (query: string) => {
        if (!editor) return []

        try {
          const defaultItems = getDefaultReactSlashMenuItems(editor)

          // Simple filter by query
          if (!query) return defaultItems
          const lowerQuery = query.toLowerCase()
          return defaultItems.filter(
            item =>
              item.title.toLowerCase().includes(lowerQuery) ||
              item.group?.toLowerCase().includes(lowerQuery)
          )
        } catch {
          return []
        }
      },
      [editor]
    )

    // Debounced save function
    const debouncedSave = useCallback(
      (blocks: PartialBlock[]) => {
        if (!onSave) return

        // Store pending blocks
        pendingBlocksRef.current = blocks

        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(async () => {
          if (pendingBlocksRef.current) {
            await saveContent(pendingBlocksRef.current)
            pendingBlocksRef.current = null
          }
        }, autoSaveDelay)
      },
      [onSave, autoSaveDelay, saveContent]
    )

    // Subscribe to editor changes
    useEffect(() => {
      if (readOnly || !editor) return

      let unsubscribe: (() => void) | undefined

      try {
        unsubscribe = editor.onChange(() => {
          try {
            debouncedSave(editor.document)
          } catch {
            // Editor might be in an invalid state
          }
        })
      } catch {
        // Editor might not be ready yet
      }

      return () => {
        unsubscribe?.()
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }, [editor, debouncedSave, readOnly])

    return (
      <div
        className="relative w-full note-editor-container"
        data-note-id={noteId}
      >
        {/* Saving indicator */}
        {isSaving && (
          <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground animate-pulse">
            Saving...
          </div>
        )}

        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          editable={!readOnly}
          slashMenu={false}
          formattingToolbar={false}
          linkToolbar={false}
          emojiPicker={false}
          data-theme-custom
        >
          {/* Slash Menu */}
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async query => getSlashMenuItems(query)}
            suggestionMenuComponent={SlashMenu}
          />

          {/* Emoji Picker - triggered by : */}
          <GridSuggestionMenuController
            triggerCharacter=":"
            columns={10}
            minQueryLength={2}
          />

          {/* Custom Formatting Toolbar with all options */}
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar>
                <BlockTypeSelect key="blockTypeSelect" />

                {/* File controls (only for file blocks) */}
                <FileCaptionButton key="fileCaptionButton" />
                <FileReplaceButton key="fileReplaceButton" />

                {/* Basic text styles */}
                <BasicTextStyleButton
                  basicTextStyle="bold"
                  key="boldStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="italic"
                  key="italicStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="underline"
                  key="underlineStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="strike"
                  key="strikeStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="code"
                  key="codeStyleButton"
                />

                {/* Text and Background Color */}
                <ColorStyleButton key="colorStyleButton" />

                {/* Text alignment */}
                <TextAlignButton
                  textAlignment="left"
                  key="textAlignLeftButton"
                />
                <TextAlignButton
                  textAlignment="center"
                  key="textAlignCenterButton"
                />
                <TextAlignButton
                  textAlignment="right"
                  key="textAlignRightButton"
                />

                {/* Nesting */}
                <NestBlockButton key="nestBlockButton" />
                <UnnestBlockButton key="unnestBlockButton" />

                {/* Links */}
                <CreateLinkButton key="createLinkButton" />
              </FormattingToolbar>
            )}
          />

          {/* Custom Link Toolbar */}
          <LinkToolbarController
            linkToolbar={props => (
              <LinkToolbar {...props}>
                <EditLinkButton
                  url={props.url}
                  text={props.text}
                  range={props.range}
                  setToolbarOpen={props.setToolbarOpen}
                  setToolbarPositionFrozen={props.setToolbarPositionFrozen}
                />
                <OpenLinkButton url={props.url} />
                <DeleteLinkButton
                  range={props.range}
                  setToolbarOpen={props.setToolbarOpen}
                />
              </LinkToolbar>
            )}
          />
        </BlockNoteView>
      </div>
    )
  }
)

// ============================================
// Export helpers
// ============================================

/**
 * Convert BlockNote document to NoteBlock format for saving
 */
export function convertBlockNoteToNoteBlocks(
  noteId: string,
  blocks: PartialBlock[]
): Omit<NoteBlock, 'createdAt' | 'updatedAt'>[] {
  return blocks.map((block, index) => ({
    id: block.id || crypto.randomUUID(),
    noteId,
    type: (block.type || 'paragraph') as NoteBlock['type'],
    content: {
      props: block.props || {},
      content: block.content || [],
      children: block.children || []
    },
    position: index
  }))
}

/**
 * Get plain text content from blocks (for AI operations)
 */
export function getPlainTextFromBlocks(blocks: PartialBlock[]): string {
  const textParts: string[] = []

  function extractText(content: unknown[] | undefined) {
    if (!content) return

    for (const item of content) {
      if (typeof item === 'string') {
        textParts.push(item)
      } else if (
        typeof item === 'object' &&
        item !== null &&
        'text' in item &&
        typeof (item as { text: unknown }).text === 'string'
      ) {
        textParts.push((item as { text: string }).text)
      }
    }
  }

  for (const block of blocks) {
    extractText(block.content as unknown[] | undefined)
    if (block.children) {
      textParts.push(getPlainTextFromBlocks(block.children as PartialBlock[]))
    }
  }

  return textParts.join(' ').trim()
}
