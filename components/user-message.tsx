'use client'

import React, { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

import { Copy, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { CollapsibleMessage } from './collapsible-message'

type UserMessageProps = {
  message: string
  messageId?: string
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  messageId,
  onUpdateMessage
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message)

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setEditedContent(message)
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setIsEditing(false)
  }

  const handleSaveClick = async () => {
    if (!onUpdateMessage || !messageId) return

    setIsEditing(false)

    try {
      await onUpdateMessage(messageId, editedContent)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleCopyClick = async () => {
    await navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard')
  }

  return (
    <div className="flex items-center justify-end gap-[3px] group">
      {!isEditing && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full size-8 shrink-0 transition-opacity',
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            )}
            onClick={handleEditClick}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full size-8 shrink-0 transition-opacity',
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            )}
            onClick={handleCopyClick}
          >
            <Copy className="size-3.5" />
          </Button>
        </>
      )}
      <CollapsibleMessage role="user">
        <div className="min-w-0 break-words outline-none relative" tabIndex={0}>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <TextareaAutosize
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                autoFocus
                className="resize-none flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                minRows={2}
                maxRows={10}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelClick}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveClick}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 break-words">{message}</div>
          )}
        </div>
      </CollapsibleMessage>
    </div>
  )
}
