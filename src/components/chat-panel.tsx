'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'

import type { UIMessage } from 'ai'
import { ChevronDown, CornerRightUp, Loader2, Plus, Square } from 'lucide-react'
import { toast } from 'sonner'

import type { AudioPart, DocumentPart, ImagePart, VideoPart } from '@/lib/types'
import { cn } from '@/lib/utils'

import { useIsAuthenticated } from '@/hooks'

import { AudioPreview } from './audio-preview'
import { ALL_SUPPORTED_TYPES, ImagePreview, useAttachments } from './chat/index'
import { DocumentPreview } from './document-preview'
import { EmptyScreen } from './empty-screen'
import { Button } from './ui/button'
import { VideoPreview } from './video-preview'

/** Tool invocation part type for AI SDK v6 */
interface ToolInvocationPart {
  type: string
  state?: 'input-available' | 'input-streaming' | 'output-available' | string
}

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    images?: ImagePart[],
    videos?: VideoPart[],
    documents?: DocumentPart[],
    audios?: AudioPart[]
  ) => void
  isLoading: boolean
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
  query?: string
  stop: () => void
  append: (message: {
    role: string
    content: string
    images?: ImagePart[]
    videos?: VideoPart[]
    documents?: DocumentPart[]
    audios?: AudioPart[]
  }) => void
  showScrollToBottomButton: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  chatId?: string
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
  scrollContainerRef,
  chatId
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false)
  const [enterDisabled, setEnterDisabled] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const isAuthenticated = useIsAuthenticated()

  // Use the attachments hook
  const {
    attachments,
    videoAttachment,
    documentAttachment,
    audioAttachment,
    hasAttachments,
    handleFileSelect,
    removeAttachment,
    removeVideoAttachment,
    removeDocumentAttachment,
    removeAudioAttachment,
    clearAttachments,
    getImageParts,
    getVideoParts,
    getDocumentParts,
    getAudioParts
  } = useAttachments({ isAuthenticated })

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => setEnterDisabled(false), 300)
  }

  const isToolInvocationInProgress = useCallback(() => {
    if (!messages.length) return false
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false
    const parts = lastMessage.parts
    const lastPart = parts[parts.length - 1] as ToolInvocationPart | undefined
    return (
      lastPart?.type?.startsWith('tool-') &&
      (lastPart?.state === 'input-available' ||
        lastPart?.state === 'input-streaming')
    )
  }, [messages])

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
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!input.trim() && !hasAttachments) return

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const currentChatId = chatId || `chat-${Date.now()}`

      const hasAttachmentsToUpload = isAuthenticated && hasAttachments
      if (hasAttachmentsToUpload) {
        setIsUploading(true)
      }

      try {
        // Get attachments
        const images =
          attachments.length > 0
            ? await getImageParts(currentChatId, messageId)
            : undefined
        const videos = videoAttachment
          ? await getVideoParts(currentChatId, messageId)
          : undefined
        const documents = documentAttachment
          ? await getDocumentParts(currentChatId, messageId)
          : undefined
        const audios = audioAttachment
          ? await getAudioParts(currentChatId, messageId)
          : undefined

        handleSubmit(e, images, videos, documents, audios)
        clearAttachments()
      } catch (error) {
        console.error('Error preparing message:', error)
        toast.error('Failed to prepare message')
      } finally {
        setIsUploading(false)
      }
    },
    [
      input,
      hasAttachments,
      chatId,
      isAuthenticated,
      attachments.length,
      videoAttachment,
      documentAttachment,
      audioAttachment,
      getImageParts,
      getVideoParts,
      getDocumentParts,
      getAudioParts,
      handleSubmit,
      clearAttachments
    ]
  )

  const hasContent = input.trim().length > 0 || hasAttachments

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
        className="relative w-full md:max-w-3xl md:mx-auto"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_SUPPORTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Attach files"
        />

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
            hasAttachments || (input.length > 0 && isMultiline)
              ? 'rounded-[26px]'
              : 'rounded-full'
          )}
        >
          {/* Media previews */}
          {hasAttachments && (
            <div className="flex flex-col gap-2 p-3 pb-0">
              <div className="flex flex-wrap gap-2">
                {attachments.map(attachment => (
                  <ImagePreview
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={removeAttachment}
                  />
                ))}
                {videoAttachment && (
                  <VideoPreview
                    attachment={videoAttachment}
                    onRemove={removeVideoAttachment}
                  />
                )}
                {documentAttachment && (
                  <DocumentPreview
                    attachment={documentAttachment}
                    onRemove={removeDocumentAttachment}
                  />
                )}
                {audioAttachment && (
                  <AudioPreview
                    attachment={audioAttachment}
                    onRemove={removeAudioAttachment}
                  />
                )}
              </div>
            </div>
          )}

          {/* Input row with attach button, textarea, and send button inline */}
          <div className="flex items-end gap-2 p-3">
            {/* Attach button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-8 shrink-0 rounded-full text-muted-foreground hover:text-accent-foreground',
                hasAttachments && 'text-primary'
              )}
              disabled={isLoading || isToolInvocationInProgress()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={28} strokeWidth={2} />
            </Button>

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
              disabled={isLoading || isToolInvocationInProgress()}
              className="resize-none flex-1 min-h-8 bg-transparent border-0 py-1.5 px-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              onHeightChange={(height, { rowHeight }) => {
                setIsMultiline(height > rowHeight)
              }}
              onChange={e => {
                handleInputChange(e)
                setShowEmptyScreen(e.target.value.length === 0)
              }}
              onKeyDown={async e => {
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
              type={isLoading || isUploading ? 'button' : 'submit'}
              size="icon"
              variant="ghost"
              className={cn(
                'size-8 shrink-0 rounded-full text-muted-foreground hover:text-accent-foreground',
                (isLoading || isUploading) && 'animate-pulse',
                hasContent && 'bg-accent text-accent-foreground'
              )}
              disabled={
                (!hasContent && !isLoading && !isUploading) ||
                isToolInvocationInProgress() ||
                isUploading
              }
              onClick={isLoading ? stop : undefined}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isLoading ? (
                <Square size={20} />
              ) : (
                <CornerRightUp size={20} />
              )}
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
