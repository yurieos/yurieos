'use client'

import { useState } from 'react'

import { ChatRequestOptions, UIMessage } from 'ai'

import { cn } from '@/lib/utils'

import { ResearchMode } from './chat'
import { RenderMessage } from './render-message'

interface ChatSection {
  id: string
  userMessage: UIMessage
  assistantMessages: UIMessage[]
}

interface ChatMessagesProps {
  sections: ChatSection[]
  onQuerySelect: (query: string) => void
  isLoading: boolean
  chatId: string
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  researchMode?: ResearchMode
}

export function ChatMessages({
  sections,
  onQuerySelect,
  isLoading,
  chatId,
  scrollContainerRef,
  onUpdateMessage,
  reload,
  researchMode
}: ChatMessagesProps) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  if (!sections.length) return null

  const allMessages = sections.flatMap(section => [
    section.userMessage,
    ...section.assistantMessages
  ])
  const lastUserIndex =
    allMessages.length -
    1 -
    [...allMessages].reverse().findIndex(msg => msg.role === 'user')

  const getIsOpen = (id: string) => {
    if (id.includes('call')) {
      return openStates[id] ?? true
    }
    const baseId = id.endsWith('-related') ? id.slice(0, -8) : id
    const index = allMessages.findIndex(msg => msg.id === baseId)
    return openStates[id] ?? index >= lastUserIndex
  }

  const handleOpenChange = (id: string, open: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [id]: open
    }))
  }

  return (
    <div
      id="scroll-container"
      ref={scrollContainerRef}
      role="list"
      aria-roledescription="chat messages"
      className={cn(
        'relative size-full pt-16 overflow-x-hidden scrollbar-thin',
        sections.length > 0 ? 'flex-1 overflow-y-auto' : ''
      )}
    >
      <div className="relative mx-auto w-full max-w-3xl px-4 min-w-0 overflow-x-hidden">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            id={`section-${section.id}`}
            className="chat-section mb-8 max-w-full overflow-x-hidden"
            style={
              sectionIndex === sections.length - 1
                ? { minHeight: 'calc(-228px + 100dvh)' }
                : {}
            }
          >
            {/* User message */}
            <div className="flex flex-col gap-4 mb-4">
              <RenderMessage
                message={section.userMessage}
                messageId={section.userMessage.id}
                getIsOpen={getIsOpen}
                onOpenChange={handleOpenChange}
                onQuerySelect={onQuerySelect}
                chatId={chatId}
                onUpdateMessage={onUpdateMessage}
                reload={reload}
                isLoading={isLoading}
                researchMode={researchMode}
              />
            </div>

            {/* Assistant messages */}
            {section.assistantMessages.map(assistantMessage => (
              <div key={assistantMessage.id} className="flex flex-col gap-4">
                <RenderMessage
                  message={assistantMessage}
                  messageId={assistantMessage.id}
                  getIsOpen={getIsOpen}
                  onOpenChange={handleOpenChange}
                  onQuerySelect={onQuerySelect}
                  chatId={chatId}
                  onUpdateMessage={onUpdateMessage}
                  reload={reload}
                  isLoading={isLoading}
                  researchMode={researchMode}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
