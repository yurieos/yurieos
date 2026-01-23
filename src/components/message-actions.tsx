'use client'

import { Copy, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'

interface MessageActionsProps {
  message: string
  messageId: string
  reload?: () => Promise<string | null | undefined>
  className?: string
  isLoading: boolean
  /** Whether the answer is complete (based on backend phase annotation) */
  isAnswerComplete?: boolean
}

export function MessageActions({
  message,
  messageId,
  reload,
  className,
  isLoading,
  isAnswerComplete = false
}: MessageActionsProps) {
  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard')
  }

  // Show buttons immediately when answer is complete, don't wait for stream to fully close
  // This makes buttons appear right when the AI finishes answering, not after follow-up generation
  const showButtons = isAnswerComplete || !isLoading

  return (
    <div
      className={cn(
        'flex items-center gap-[3px] self-start transition-opacity duration-200',
        showButtons ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {reload && (
        <Button
          className="rounded-full size-8"
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => reload()}
          aria-label={`Retry from message ${messageId}`}
        >
          <RotateCcw size={14} />
          <span className="sr-only">Retry</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="rounded-full size-8"
      >
        <Copy size={14} />
      </Button>
    </div>
  )
}
