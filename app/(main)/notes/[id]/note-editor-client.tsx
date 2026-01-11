'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { PartialBlock } from '@blocknote/core'
import { Check, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { archiveNote, saveBlocks, updateNote } from '@/lib/actions/notes'
import type { Note, NoteWithBlocks } from '@/lib/types/notes'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

import {
  convertBlockNoteToNoteBlocks,
  EditorErrorBoundary,
  NoteBreadcrumb,
  NoteEditor,
  type NoteEditorHandle,
  NoteHeader
} from '@/components/notes'

// ============================================
// Types
// ============================================

interface NoteEditorClientProps {
  note: NoteWithBlocks
}

type SaveStatus = 'idle' | 'saving' | 'saved'

// ============================================
// Note Editor Client Component - Apple Notes Style
// ============================================

export function NoteEditorClient({ note: initialNote }: NoteEditorClientProps) {
  const router = useRouter()
  const [note, setNote] = useState<NoteWithBlocks>(initialNote)
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const editorRef = useRef<NoteEditorHandle>(null)

  // Auto-reset saved status back to idle after 2 seconds
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Handle note header updates (title, icon)
  const handleNoteUpdate = useCallback(
    (updates: Partial<Note>) => {
      setSaveStatus('saving')
      startTransition(async () => {
        const result = await updateNote(note.id, updates)
        if (result.note) {
          setNote(prev => ({ ...prev, ...result.note }))
          setSaveStatus('saved')
        }
      })
    },
    [note.id]
  )

  // Handle block saves (auto-save)
  const handleSave = useCallback(
    async (blocks: PartialBlock[]) => {
      setSaveStatus('saving')
      try {
        const noteBlocks = convertBlockNoteToNoteBlocks(note.id, blocks)
        await saveBlocks(note.id, { blocks: noteBlocks })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    },
    [note.id]
  )

  // Archive note handler
  const handleArchive = useCallback(async () => {
    startTransition(async () => {
      const result = await archiveNote(note.id)
      if (result.success) {
        toast.success('Note moved to trash')
        router.push('/notes')
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }, [note.id, router])

  // Keyboard shortcut for save (Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        editorRef.current?.forceSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex-1 flex flex-col w-full overflow-y-auto">
      {/* Header with breadcrumb */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between h-12">
          <NoteBreadcrumb note={note} />

          {/* Save status & actions */}
          <div className="flex items-center gap-1 pr-2">
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 mr-2 text-muted-foreground">
              {saveStatus === 'saving' && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {saveStatus === 'saved' && (
                <Check className="size-3.5 text-primary" />
              )}
            </div>

            {/* Actions menu */}
            <TooltipProvider delayDuration={0}>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        disabled={isPending}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>More actions</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={handleArchive}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Move to trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 w-full">
        {/* Note header with title and icon */}
        <NoteHeader note={note} onUpdate={handleNoteUpdate} />

        {/* Editor */}
        <div className="max-w-7xl mx-auto pb-40 px-4 sm:px-8 lg:px-12">
          <EditorErrorBoundary>
            <NoteEditor
              ref={editorRef}
              noteId={note.id}
              initialBlocks={note.blocks}
              onSave={handleSave}
            />
          </EditorErrorBoundary>
        </div>
      </div>
    </div>
  )
}
