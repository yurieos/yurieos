import { memo, useMemo } from 'react'

import { ChatRequestOptions, JSONValue, UIMessage } from 'ai'

import { ResearchAnnotation } from '@/lib/types'

import { AnswerSection } from './answer-section'
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

// Generic helper to extract parts by type
// Uses type assertion since custom part types are not in AI SDK
function getPartsByType<T>(parts: UIMessage['parts'], type: string): T[] {
  if (!parts) return []
  return parts
    .filter(p => (p as { type: string }).type === type)
    .map(p => p as unknown as T)
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
  // Check for agentic-phase complete
  const hasAgenticComplete = annotations.some(
    a => a.type === 'agentic-phase' && a.data.phase === 'complete'
  )
  // Legacy: check for research-complete (for backwards compatibility with old chats)
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
  isLoading
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

  // Handle user messages
  if (message.role === 'user') {
    const userImages = getPartsByType<MessageImagePart>(message.parts, 'image')
    const userVideos = getPartsByType<MessageVideoPart>(message.parts, 'video')
    const userDocuments = getPartsByType<MessageDocumentPart>(
      message.parts,
      'document'
    )
    const userAudios = getPartsByType<MessageAudioPart>(message.parts, 'audio')
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
  const generatedImages = getPartsByType<MessageGeneratedImagePart>(
    message.parts,
    'generated-image'
  )

  return (
    <>
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
