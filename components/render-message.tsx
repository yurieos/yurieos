import { memo, useMemo } from 'react'

import { ChatRequestOptions, JSONValue, UIMessage } from 'ai'

import { ResearchAnnotation } from '@/lib/types/sources'

import { AnswerSection } from './answer-section'
import { ResearchMode } from './chat'
import RelatedQuestions from './related-questions'
import { ThinkingDisplay } from './thinking-display'
import { UserMessage } from './user-message'

interface RenderMessageProps {
  message: UIMessage
  messageId: string
  getIsOpen: (id: string) => boolean
  onOpenChange: (id: string, open: boolean) => void
  onQuerySelect: (query: string) => void
  chatId?: string
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
  isLoading: boolean
  researchMode?: ResearchMode
}

/** Text part from UIMessage */
interface TextPart {
  type: 'text'
  text: string
}

/** Metadata shape for UIMessage with annotations */
interface MessageMetadata {
  annotations?: ResearchAnnotation[]
}

// Helper to extract text from message parts
function getTextFromParts(parts: UIMessage['parts']): string {
  if (!parts) return ''
  return parts
    .filter((p): p is TextPart => p.type === 'text')
    .map(p => p.text || '')
    .join('')
}

// Helper to get annotations from message metadata
function getAnnotations(message: UIMessage): ResearchAnnotation[] {
  const metadata = message.metadata as MessageMetadata | undefined
  return metadata?.annotations || []
}

// Helper to check if the answer is complete based on annotations
function isAnswerCompleteFromAnnotations(
  annotations: ResearchAnnotation[]
): boolean {
  // Check for agentic-phase complete (standard mode)
  const hasAgenticComplete = annotations.some(
    a => a.type === 'agentic-phase' && a.data.phase === 'complete'
  )
  // Check for deep research complete
  const hasResearchComplete = annotations.some(
    a => a.type === 'research-complete' && a.data.phase === 'complete'
  )
  return hasAgenticComplete || hasResearchComplete
}

export const RenderMessage = memo(function RenderMessage({
  message,
  messageId,
  getIsOpen,
  onOpenChange,
  onQuerySelect,
  chatId,
  onUpdateMessage,
  reload,
  isLoading,
  researchMode
}: RenderMessageProps) {
  const annotations = useMemo(() => getAnnotations(message), [message])

  const relatedQuestions = useMemo(
    () => annotations.filter(a => a.type === 'related-questions'),
    [annotations]
  )

  // Check if the answer streaming is complete (based on backend phase annotation)
  const isAnswerComplete = useMemo(
    () => isAnswerCompleteFromAnnotations(annotations),
    [annotations]
  )

  // Check if there are thought steps for ChainOfThought display
  const hasThoughtSteps = useMemo(
    () => annotations.some(a => a.type === 'thought-step'),
    [annotations]
  )

  // Show pulsing dot when in deep research mode, loading, and no thought steps yet
  const showDeepResearchLoading = useMemo(
    () =>
      researchMode === 'deep-research' &&
      isLoading &&
      !hasThoughtSteps &&
      message.role === 'assistant',
    [researchMode, isLoading, hasThoughtSteps, message.role]
  )

  // Handle user messages
  if (message.role === 'user') {
    return (
      <UserMessage
        message={getTextFromParts(message.parts)}
        messageId={messageId}
        onUpdateMessage={onUpdateMessage}
      />
    )
  }

  // For assistant messages
  const textContent = getTextFromParts(message.parts)

  return (
    <>
      {/* Deep Research Loading Indicator - Pulsing dot while waiting for thought steps */}
      {showDeepResearchLoading && (
        <div className="w-full max-w-3xl mb-4">
          <div className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex size-4 items-center justify-center">
                <span className="inline-flex size-2 animate-pulse-scale rounded-full bg-current" />
              </span>
              <span>Starting deep research...</span>
            </div>
          </div>
        </div>
      )}

      {/* Chain of Thought - Display Gemini's thinking process */}
      {/* Per https://ai.google.dev/gemini-api/docs/thinking - thought summaries provide insights */}
      {hasThoughtSteps && (
        <ThinkingDisplay message={message} className="mb-4 animate-fade-in" />
      )}

      {/* Regular answer content - citations are inline markdown links */}
      {textContent && (
        <AnswerSection
          content={textContent}
          isOpen={getIsOpen(messageId)}
          onOpenChange={open => onOpenChange(messageId, open)}
          messageId={messageId}
          reload={reload}
          isLoading={isLoading}
          isAnswerComplete={isAnswerComplete}
        />
      )}

      {relatedQuestions.length > 0 && (
        <RelatedQuestions
          annotations={relatedQuestions as unknown as JSONValue[]}
          onQuerySelect={onQuerySelect}
          isOpen={getIsOpen(`${messageId}-related`)}
          onOpenChange={open => onOpenChange(`${messageId}-related`, open)}
          chatId={chatId || ''}
          isLoading={isLoading}
        />
      )}
    </>
  )
})
