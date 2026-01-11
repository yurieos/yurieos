import { AudioPart, DocumentPart, ImagePart, VideoPart } from '@/lib/types'

/**
 * Message part types for chat messages
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string }
  | { type: 'video'; mimeType?: string; data?: string; fileUri?: string }
  | { type: 'document'; mimeType: string; data?: string; fileUri?: string }
  | { type: 'audio'; mimeType: string; data?: string; fileUri?: string }

/**
 * Input for building message parts
 */
export interface MediaPartsInput {
  /** Text content */
  text?: string
  /** Image attachments */
  images?: ImagePart[]
  /** Video attachments */
  videos?: VideoPart[]
  /** Document attachments */
  documents?: DocumentPart[]
  /** Audio attachments */
  audios?: AudioPart[]
}

/**
 * Build message parts array in Gemini best practices order.
 *
 * Order: images → videos → documents → audio → text
 *
 * @see https://ai.google.dev/gemini-api/docs/image-understanding#tips-and-best-practices
 * @see https://ai.google.dev/gemini-api/docs/video-understanding#tips-and-best-practices
 * @see https://ai.google.dev/gemini-api/docs/document-processing#best-practices
 * @see https://ai.google.dev/gemini-api/docs/audio
 */
export function buildMessageParts({
  text,
  images,
  videos,
  documents,
  audios
}: MediaPartsInput): MessagePart[] {
  const parts: MessagePart[] = []

  // Add images first
  if (images && images.length > 0) {
    for (const img of images) {
      parts.push({
        type: 'image',
        mimeType: img.mimeType,
        data: img.data
      })
    }
  }

  // Add videos second
  if (videos && videos.length > 0) {
    for (const vid of videos) {
      parts.push({
        type: 'video',
        mimeType: vid.mimeType,
        data: vid.data,
        fileUri: vid.fileUri
      })
    }
  }

  // Add documents third
  if (documents && documents.length > 0) {
    for (const doc of documents) {
      parts.push({
        type: 'document',
        mimeType: doc.mimeType,
        data: doc.data,
        fileUri: doc.fileUri
      })
    }
  }

  // Add audio fourth
  if (audios && audios.length > 0) {
    for (const aud of audios) {
      parts.push({
        type: 'audio',
        mimeType: aud.mimeType,
        data: aud.data,
        fileUri: aud.fileUri
      })
    }
  }

  // Add text last
  if (text && text.trim()) {
    parts.push({ type: 'text', text })
  }

  return parts
}

/**
 * Check if media parts input has any content
 */
export function hasMediaContent(input: MediaPartsInput): boolean {
  return (
    Boolean(input.text?.trim()) ||
    (input.images?.length ?? 0) > 0 ||
    (input.videos?.length ?? 0) > 0 ||
    (input.documents?.length ?? 0) > 0 ||
    (input.audios?.length ?? 0) > 0
  )
}
