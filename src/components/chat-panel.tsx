'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'

import type { UIMessage } from 'ai'
import { ChevronDown, CornerRightUp, Square } from 'lucide-react'

import { cn } from '@/lib/utils'

import { EmptyScreen } from './empty-screen'
import { Button } from './ui/button'

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
  query?: string
  stop: () => void
  append: (message: { role: string; content: string }) => void
  showScrollToBottomButton: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  query,
  stop,
  append,
  showScrollToBottomButton,
  scrollContainerRef
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false)
  const [enterDisabled, setEnterDisabled] = useState(false)

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => setEnterDisabled(false), 300)
  }

  // Submit query on mount if provided
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally runs only on query change with ref guard to prevent duplicate submissions
  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({ role: 'user', content: query })
      isFirstRender.current = false
    }
  }, [query])

  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Handle form submission
  const onFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim()) return
      handleSubmit(e)
    },
    [input, handleSubmit]
  )

  const hasContent = input.trim().length > 0

  return (
    <div
      className={cn(
        'w-full bg-background group/form-container shrink-0',
        messages.length > 0 ? 'sticky bottom-0 px-4 pb-4' : 'px-4'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <p className="text-center text-[1.625rem] font-semibold">
            What can I help with?
          </p>
        </div>
      )}

      <form
        onSubmit={onFormSubmit}
        className="max-w-3xl w-full mx-auto relative"
      >
        {/* Scroll to bottom button */}
        {showScrollToBottomButton && messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -top-10 right-4 z-20 size-8 rounded-full shadow-md"
            onClick={handleScrollToBottom}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </Button>
        )}

        <div
          className={cn(
            'relative flex flex-col w-full bg-muted border border-input',
            input.length > 0 && isMultiline ? 'rounded-[26px]' : 'rounded-full'
          )}
        >
          {/* Input row with textarea and send button inline */}
          <div className="flex items-end gap-2 p-3">
            {/* Textarea */}
            <Textarea
              ref={inputRef}
              name="input"
              rows={1}
              maxRows={5}
              tabIndex={0}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder="Ask anything"
              spellCheck={false}
              value={input}
              disabled={isLoading}
              className="resize-none flex-1 min-h-8 bg-transparent border-0 py-1.5 px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              onHeightChange={(height, { rowHeight }) => {
                setIsMultiline(height > rowHeight)
              }}
              onChange={e => {
                handleInputChange(e)
                setShowEmptyScreen(e.target.value.length === 0)
              }}
              onKeyDown={e => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !isComposing &&
                  !enterDisabled
                ) {
                  if (!hasContent) {
                    e.preventDefault()
                    return
                  }
                  e.preventDefault()
                  const textarea = e.target as HTMLTextAreaElement
                  textarea.form?.requestSubmit()
                }
              }}
              onFocus={() => setShowEmptyScreen(true)}
              onBlur={() => setShowEmptyScreen(false)}
            />

            {/* Send/Stop button */}
            <Button
              type={isLoading ? 'button' : 'submit'}
              size="icon"
              variant="ghost"
              className={cn(
                'size-8 shrink-0 rounded-full text-muted-foreground hover:text-accent-foreground',
                isLoading && 'animate-pulse',
                hasContent && 'bg-accent text-accent-foreground'
              )}
              disabled={!hasContent && !isLoading}
              onClick={isLoading ? stop : undefined}
            >
              {isLoading ? <Square size={20} /> : <CornerRightUp size={20} />}
            </Button>
          </div>
        </div>

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message =>
              append({ role: 'user', content: message })
            }
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>
    </div>
  )
}
