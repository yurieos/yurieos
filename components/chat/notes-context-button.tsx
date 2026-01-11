'use client'

import { AtSign } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

// ============================================
// Types
// ============================================

interface NotesContextButtonProps {
  /** Whether notes are selected */
  hasContext: boolean
  /** Open the notes picker dialog */
  onClick: () => void
  /** Disable the button */
  disabled?: boolean
  /** Number of selected notes */
  selectedCount?: number
}

// ============================================
// Component
// ============================================

/**
 * Notes Context Button
 *
 * "@" button to open the notes picker dialog.
 * Styled consistently with the Paperclip attachment button.
 */
export function NotesContextButton({
  hasContext,
  onClick,
  disabled = false,
  selectedCount = 0
}: NotesContextButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'size-8 rounded-lg text-muted-foreground hover:text-accent-foreground relative',
        hasContext && 'text-primary border-primary'
      )}
      disabled={disabled}
      onClick={onClick}
      title="Add notes context (Cmd+Shift+N)"
      aria-label={
        hasContext
          ? `${selectedCount} notes selected. Click to manage notes context.`
          : 'Add notes as context for AI'
      }
    >
      <AtSign size={14} />
      {hasContext && selectedCount > 0 && (
        <span
          className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center"
          aria-hidden="true"
        >
          {selectedCount > 9 ? '9+' : selectedCount}
        </span>
      )}
    </Button>
  )
}
