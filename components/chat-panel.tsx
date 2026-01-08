'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'

import { UIMessage } from 'ai'
import { ChevronDown, CornerRightUp, Square, Telescope } from 'lucide-react'

import { cn } from '@/lib/utils'

import { useCurrentUserName } from '@/hooks/use-current-user-name'

import { Button } from './ui/button'
import type { ResearchMode } from './chat'
import { EmptyScreen } from './empty-screen'

/** Tool invocation part type for AI SDK v6 */
interface ToolInvocationPart {
  type: string
  state?: 'input-available' | 'input-streaming' | 'output-available' | string
}

// Deep Research Toggle Button Component
// Uses official Gemini Deep Research Agent via Interactions API
// @see https://ai.google.dev/gemini-api/docs/deep-research
function DeepResearchToggle({
  isActive,
  onToggle,
  disabled = false
}: {
  isActive: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg',
        'text-xs font-medium transition-colors duration-200',
        'border border-input bg-background',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Telescope size={14} />
      <span>Deep Research</span>
    </button>
  )
}

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
  /** Whether to show the scroll to bottom button */
  showScrollToBottomButton: boolean
  /** Reference to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** Current research mode */
  researchMode?: ResearchMode
  /** Callback when research mode changes */
  onResearchModeChange?: (mode: ResearchMode) => void
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  setMessages,
  query,
  stop,
  append,
  showScrollToBottomButton,
  scrollContainerRef,
  researchMode = 'standard',
  onResearchModeChange
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false) // Composition state
  const [enterDisabled, setEnterDisabled] = useState(false) // Disable Enter after composition ends
  const fullName = useCurrentUserName()
  const firstName = fullName.split(' ')[0]

  const isDeepResearch = researchMode === 'deep-research'

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => {
      setEnterDisabled(false)
    }, 300)
  }

  const isToolInvocationInProgress = useCallback(() => {
    if (!messages.length) return false

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false

    const parts = lastMessage.parts
    const lastPart = parts[parts.length - 1] as ToolInvocationPart | undefined

    // In v6, tool parts have type like 'tool-{toolName}' and state directly on the part
    return (
      lastPart?.type?.startsWith('tool-') &&
      (lastPart?.state === 'input-available' ||
        lastPart?.state === 'input-streaming')
    )
  }, [messages])

  const toggleResearchMode = useCallback(() => {
    const newMode: ResearchMode = isDeepResearch ? 'standard' : 'deep-research'
    onResearchModeChange?.(newMode)
  }, [isDeepResearch, onResearchModeChange])

  // Keyboard shortcut for toggling Deep Research mode (Cmd+D / Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+D (Mac) or Ctrl+D (Windows/Linux)
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'd'
      ) {
        e.preventDefault()
        // Don't toggle if loading or tool invocation in progress
        if (!isLoading && !isToolInvocationInProgress()) {
          toggleResearchMode()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, isToolInvocationInProgress, toggleResearchMode])

  // if query is not empty, submit the query
  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({
        role: 'user',
        content: query
      })
      isFirstRender.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Scroll to the bottom of the container
  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div
      className={cn(
        'w-full bg-background group/form-container shrink-0',
        messages.length > 0 ? 'sticky bottom-0 px-2 pb-4' : 'px-6'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <p className="text-center text-[1.625rem] font-semibold">
            {isDeepResearch ? (
              'What are you researching?'
            ) : firstName && firstName !== '?' ? (
              <>
                Hello, <em>{firstName}</em>.
              </>
            ) : (
              'What can I help with?'
            )}
          </p>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn('max-w-3xl w-full mx-auto relative')}
      >
        {/* Scroll to bottom button - only shown when showScrollToBottomButton is true */}
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

        <div className="relative flex flex-col w-full gap-2 bg-muted rounded-lg border border-input">
          <Textarea
            ref={inputRef}
            name="input"
            rows={2}
            maxRows={5}
            tabIndex={0}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={
              isDeepResearch ? 'Get a detailed report' : 'Ask anything'
            }
            spellCheck={false}
            value={input}
            disabled={isLoading || isToolInvocationInProgress()}
            className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                if (input.trim().length === 0) {
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

          {/* Bottom menu area */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <DeepResearchToggle
                isActive={isDeepResearch}
                onToggle={toggleResearchMode}
                disabled={isLoading || isToolInvocationInProgress()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type={isLoading ? 'button' : 'submit'}
                size={'icon'}
                variant={'outline'}
                className={cn(
                  isLoading && 'animate-pulse',
                  'rounded-lg size-8'
                )}
                disabled={
                  (input.length === 0 && !isLoading) ||
                  isToolInvocationInProgress()
                }
                onClick={isLoading ? stop : undefined}
              >
                {isLoading ? <Square size={16} /> : <CornerRightUp size={16} />}
              </Button>
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message => {
              append({
                role: 'user',
                content: message
              })
            }}
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>
    </div>
  )
}
