'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { SmilePlus } from 'lucide-react'

import type { Note } from '@/lib/types/notes'
import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

// ============================================
// Types
// ============================================

interface NoteHeaderProps {
  note: Note
  onUpdate: (updates: Partial<Note>) => void | Promise<void>
}

// ============================================
// Common Emojis
// ============================================

const EMOJIS = [
  '📝',
  '📋',
  '📚',
  '📖',
  '📄',
  '✏️',
  '🖊️',
  '📌',
  '🎯',
  '💡',
  '⭐',
  '❤️',
  '🔥',
  '✅',
  '🚀',
  '💼',
  '🏠',
  '🎨',
  '🎵',
  '📷',
  '🌟',
  '🌈',
  '🌸',
  '🍀',
  '🌙',
  '☀️',
  '⚡',
  '🔮',
  '💎',
  '🎁',
  '📱',
  '💻'
]

// ============================================
// Note Header Component
// ============================================

export function NoteHeader({ note, onUpdate }: NoteHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [iconOpen, setIconOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const startEditing = useCallback(() => {
    setEditingTitle(note.title)
    setIsEditingTitle(true)
  }, [note.title])

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    if (editingTitle !== note.title) {
      onUpdate({ title: editingTitle })
    }
  }, [editingTitle, note.title, onUpdate])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleTitleBlur()
      }
      if (e.key === 'Escape') {
        setEditingTitle(note.title)
        setIsEditingTitle(false)
      }
    },
    [handleTitleBlur, note.title]
  )

  const handleIconSelect = useCallback(
    (emoji: string) => {
      onUpdate({ icon: emoji })
      setIconOpen(false)
    },
    [onUpdate]
  )

  const handleRemoveIcon = useCallback(() => {
    onUpdate({ icon: null })
    setIconOpen(false)
  }, [onUpdate])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="max-w-7xl mx-auto pt-4 pb-4 px-6 sm:px-8 lg:px-12">
        {/* Icon */}
        {note.icon && (
          <Popover open={iconOpen} onOpenChange={setIconOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className="block text-6xl sm:text-7xl leading-none mb-3 p-2 -ml-2 hover:bg-accent/50 active:scale-95 transition-all select-none">
                    {note.icon}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Change icon</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 p-3" align="start" sideOffset={8}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Choose icon</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleRemoveIcon}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      className="size-8 flex items-center justify-center text-xl hover:bg-accent active:scale-90 transition-all"
                      onClick={() => handleIconSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Title */}
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={editingTitle}
            onChange={e => setEditingTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className={cn(
              'text-4xl sm:text-5xl font-bold',
              'border-none shadow-none focus-visible:ring-0',
              'px-0 h-auto py-0 bg-transparent w-full',
              'placeholder:text-muted-foreground/40'
            )}
            placeholder="Untitled"
          />
        ) : (
          <h1
            className="text-4xl sm:text-5xl font-bold cursor-text group"
            onClick={startEditing}
          >
            {note.title || (
              <span className="text-muted-foreground/40">Untitled</span>
            )}
            {/* Add icon button - shows on hover when no icon */}
            {!note.icon && (
              <Popover open={iconOpen} onOpenChange={setIconOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        className="inline-flex items-center ml-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity align-middle"
                        onClick={e => {
                          e.stopPropagation()
                          setIconOpen(true)
                        }}
                      >
                        <SmilePlus className="size-6 sm:size-7 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Add icon</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  className="w-72 p-3"
                  align="start"
                  sideOffset={8}
                >
                  <div className="flex flex-col gap-3">
                    <span className="text-sm font-medium">Choose icon</span>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((emoji, index) => (
                        <button
                          key={`${emoji}-${index}`}
                          className="size-8 flex items-center justify-center text-xl hover:bg-accent active:scale-90 transition-all"
                          onClick={() => handleIconSelect(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </h1>
        )}
      </div>
    </TooltipProvider>
  )
}
