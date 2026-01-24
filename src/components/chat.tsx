'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'

// Define section structure
interface ChatSection {
  id: string // User message ID
  userMessage: UIMessage
  assistantMessages: UIMessage[]
}

export function Chat({
  id,
  savedMessages = [],
  query
}: {
  id: string
  savedMessages?: UIMessage[]
  query?: string
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [input, setInput] = useState('')

  // Create transport for chat API
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ id: chatId, messages }) => {
          return {
            body: {
              id: chatId,
              messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                parts: m.parts
              }))
            }
          }
        }
      }),
    []
  )

  const { messages, status, setMessages, stop, sendMessage, regenerate } =
    useChat({
      id,
      messages: savedMessages,
      transport,
      onFinish: () => {
        // Only update URL if we're on the home page (new chat)
        // Don't update if we're already on a search page to avoid hijacking navigation
        if (window.location.pathname === '/') {
          window.history.replaceState({}, '', `/search/${id}`)
        }
        window.dispatchEvent(new CustomEvent('chat-history-updated'))
      },
      onError: error => {
        toast.error(`Error in chat: ${error.message}`)
      },
      experimental_throttle: 50
    })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        // Start a new section when a user message is found
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection && message.role === 'assistant') {
        // Add assistant message to the current section
        currentSection.assistantMessages.push(message)
      }
      // Ignore other role types like 'system' for now
    }

    // Add the last section if exists
    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  // Detect if scroll container is at the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 50 // threshold in pixels
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Set initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to the section when a new user message is sent
  useEffect(() => {
    // Only scroll if this chat is currently visible in the URL
    const isCurrentChat =
      window.location.pathname === `/search/${id}` ||
      (window.location.pathname === '/' && sections.length > 0)

    if (isCurrentChat && sections.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        // If the last message is from user, find the corresponding section
        const sectionId = lastMessage.id
        requestAnimationFrame(() => {
          const sectionElement = document.getElementById(`section-${sectionId}`)
          sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [sections, messages, id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally only re-run when chat ID changes to reset messages for new chat
  useEffect(() => {
    setMessages(savedMessages)
  }, [id])

  const onQuerySelect = useCallback(
    (queryText: string) => {
      sendMessage({ text: queryText })
    },
    [sendMessage]
  )

  const handleUpdateAndReloadMessage = async (
    messageId: string,
    newContent: string
  ) => {
    // Update the message content
    setMessages(currentMessages =>
      currentMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, parts: [{ type: 'text' as const, text: newContent }] }
          : msg
      )
    )

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const messagesUpToEdited = messages.slice(0, messageIndex + 1)
      setMessages(messagesUpToEdited)

      await regenerate({ messageId })
    } catch (error) {
      console.error('Failed to reload after message update:', error)
      toast.error(`Failed to reload conversation: ${(error as Error).message}`)
    }
  }

  const handleReloadFrom = async (
    messageId: string
  ): Promise<string | null | undefined> => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      const userMessageIndex = messages
        .slice(0, messageIndex)
        .findLastIndex(m => m.role === 'user')
      if (userMessageIndex !== -1) {
        const trimmedMessages = messages.slice(0, userMessageIndex + 1)
        setMessages(trimmedMessages)
        await regenerate()
        return null
      }
    }
    await regenerate()
    return null
  }

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!input.trim()) return

      sendMessage({ text: input })
      setInput('')
    },
    [input, sendMessage]
  )

  const handleAppend = useCallback(
    (msg: { role: string; content: string }) => {
      sendMessage({ text: msg.content })
    },
    [sendMessage]
  )

  return (
    <div
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col overflow-x-hidden',
        messages.length === 0 ? 'items-center justify-center pt-[8vh]' : ''
      )}
      data-testid="full-chat"
    >
      <ChatMessages
        sections={sections}
        onQuerySelect={onQuerySelect}
        isLoading={isLoading}
        chatId={id}
        scrollContainerRef={scrollContainerRef}
        onUpdateMessage={handleUpdateAndReloadMessage}
        reload={handleReloadFrom}
      />
      <ChatPanel
        input={input}
        handleInputChange={e => setInput(e.target.value)}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        messages={messages}
        setMessages={setMessages}
        stop={stop}
        query={query}
        append={handleAppend}
        showScrollToBottomButton={!isAtBottom}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  )
}
