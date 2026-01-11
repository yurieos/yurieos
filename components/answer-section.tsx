'use client'

import { memo } from 'react'

import { ChatRequestOptions } from 'ai'

import { CollapsibleMessage } from './collapsible-message'
import { DefaultSkeleton } from './default-skeleton'
import { BotMessage } from './message'
import { MessageActions } from './message-actions'

export type AnswerSectionProps = {
  content: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  showActions?: boolean
  messageId: string
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  isLoading: boolean
  /** Whether the answer is complete (based on backend phase annotation) */
  isAnswerComplete?: boolean
}

export const AnswerSection = memo(function AnswerSection({
  content,
  isOpen,
  onOpenChange,
  showActions = true, // Default to true for backward compatibility
  messageId,
  reload,
  isLoading,
  isAnswerComplete = false
}: AnswerSectionProps) {
  const handleReload = () => {
    if (reload) {
      return reload(messageId)
    }
    return Promise.resolve(undefined)
  }

  const message = content ? (
    <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
      <BotMessage message={content} />
      {showActions && (
        <MessageActions
          message={content} // Keep original message content for copy
          messageId={messageId}
          reload={handleReload}
          isLoading={isLoading}
          isAnswerComplete={isAnswerComplete}
        />
      )}
    </div>
  ) : (
    <DefaultSkeleton />
  )
  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showIcon={false}
    >
      {message}
    </CollapsibleMessage>
  )
})
