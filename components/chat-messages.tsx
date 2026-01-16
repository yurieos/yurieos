'use client'

import { useCallback, useMemo, useState } from 'react'

import { ChatRequestOptions, UIMessage } from 'ai'

import { cn } from '@/lib/utils'

import { ChatErrorBoundary } from './error-boundary'
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
}

export function ChatMessages({
  sections,
  onQuerySelect,
  isLoading,
  chatId,
  scrollContainerRef,
  onUpdateMessage,
  reload
}: ChatMessagesProps) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  // Memoize flattened messages array
  const allMessages = useMemo(
    () =>
      sections.flatMap(section => [
        section.userMessage,
        ...section.assistantMessages
      ]),
    [sections]
  )

  // Memoize last user index computation
  const lastUserIndex = useMemo(() => {
    if (allMessages.length === 0) return -1
    return (
      allMessages.length -
      1 -
      [...allMessages].reverse().findIndex(msg => msg.role === 'user')
    )
  }, [allMessages])

  // Memoize getIsOpen callback
  const getIsOpen = useCallback(
    (id: string) => {
      if (id.includes('call')) {
        return openStates[id] ?? true
      }
      const baseId = id.endsWith('-related') ? id.slice(0, -8) : id
      const index = allMessages.findIndex(msg => msg.id === baseId)
      return openStates[id] ?? index >= lastUserIndex
    },
    [openStates, allMessages, lastUserIndex]
  )

  // Memoize handleOpenChange callback
  const handleOpenChange = useCallback((id: string, open: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [id]: open
    }))
  }, [])

  if (!sections.length) return null

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
              <ChatErrorBoundary>
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
                />
              </ChatErrorBoundary>
            </div>

            {/* Assistant messages */}
            {section.assistantMessages.map(assistantMessage => (
              <div key={assistantMessage.id} className="flex flex-col gap-4">
                <ChatErrorBoundary>
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
                  />
                </ChatErrorBoundary>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
