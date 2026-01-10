import { memo, useMemo } from 'react'

import { ChatRequestOptions, JSONValue, UIMessage } from 'ai'

import { ResearchAnnotation } from '@/lib/types'

import { AnswerSection } from './answer-section'
import { ResearchMode } from './chat'
import { GeneratedImage } from './generated-image'
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

/** Image part from UIMessage */
interface MessageImagePart {
  type: 'image'
  mimeType: string
  data: string
}

/** Video part from UIMessage */
interface MessageVideoPart {
  type: 'video'
  mimeType?: string
  data?: string
  fileUri?: string
}

/** Document part from UIMessage */
interface MessageDocumentPart {
  type: 'document'
  mimeType: string
  data?: string
  fileUri?: string
  filename?: string
}

/** Audio part from UIMessage */
interface MessageAudioPart {
  type: 'audio'
  mimeType: string
  data?: string
  fileUri?: string
  filename?: string
}

/** Generated image part from UIMessage */
interface MessageGeneratedImagePart {
  type: 'generated-image'
  data: string
  mimeType: string
  aspectRatio?: string
  thoughtSignature?: string
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

// Helper to extract image parts from message
// Uses type assertion since 'image' is a custom part type not in AI SDK
function getImageParts(parts: UIMessage['parts']): MessageImagePart[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === 'image')
    .map(p => p as unknown as MessageImagePart)
}

// Helper to extract video parts from message
// Uses type assertion since 'video' is a custom part type not in AI SDK
function getVideoParts(parts: UIMessage['parts']): MessageVideoPart[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === 'video')
    .map(p => p as unknown as MessageVideoPart)
}

// Helper to extract document parts from message
// Uses type assertion since 'document' is a custom part type not in AI SDK
function getDocumentParts(parts: UIMessage['parts']): MessageDocumentPart[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === 'document')
    .map(p => p as unknown as MessageDocumentPart)
}

// Helper to extract audio parts from message
// Uses type assertion since 'audio' is a custom part type not in AI SDK
function getAudioParts(parts: UIMessage['parts']): MessageAudioPart[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === 'audio')
    .map(p => p as unknown as MessageAudioPart)
}

// Helper to extract generated image parts from message
// Uses type assertion since 'generated-image' is a custom part type not in AI SDK
function getGeneratedImageParts(
  parts: UIMessage['parts']
): MessageGeneratedImagePart[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === 'generated-image')
    .map(p => p as unknown as MessageGeneratedImagePart)
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
    const userImages = getImageParts(message.parts)
    const userVideos = getVideoParts(message.parts)
    const userDocuments = getDocumentParts(message.parts)
    const userAudios = getAudioParts(message.parts)
    return (
      <UserMessage
        message={getTextFromParts(message.parts)}
        messageId={messageId}
        onUpdateMessage={onUpdateMessage}
        images={userImages.length > 0 ? userImages : undefined}
        videos={userVideos.length > 0 ? userVideos : undefined}
        documents={userDocuments.length > 0 ? userDocuments : undefined}
        audios={userAudios.length > 0 ? userAudios : undefined}
      />
    )
  }

  // For assistant messages
  const textContent = getTextFromParts(message.parts)
  const generatedImages = getGeneratedImageParts(message.parts)

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

      {/* Generated Images from AI */}
      {generatedImages.length > 0 && (
        <div className="flex flex-wrap gap-4 my-4">
          {generatedImages.map((img, idx) => (
            <GeneratedImage
              key={`gen-img-${messageId}-${idx}`}
              imageData={img.data}
              mimeType={img.mimeType}
              aspectRatio={img.aspectRatio}
              alt={`AI Generated Image ${idx + 1}`}
            />
          ))}
        </div>
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
