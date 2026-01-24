import { notFound, redirect } from 'next/navigation'

import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/get-current-user'
import type { ExtendedCoreMessage, SearchResults } from '@/lib/types'
import { convertToUIMessages } from '@/lib/utils'

import { Chat } from '@/components/chat'
import { ChatErrorBoundary } from '@/components/error-boundary'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const chat = await getChat(id)

  const metadata: {
    title: string
    openGraph?: { images?: { url: string; width?: number; height?: number }[] }
  } = {
    title: chat?.title?.toString().slice(0, 50) || 'Search'
  }

  if (chat?.messages) {
    const dataMessage = chat.messages.find(
      (msg: ExtendedCoreMessage) => msg.role === 'data'
    )

    if (dataMessage?.content) {
      // Assuming dataMessage.content is of type SearchResults or a compatible structure
      const searchData = dataMessage.content as SearchResults
      if (searchData.images && searchData.images.length > 0) {
        const firstImage = searchData.images[0]
        let imageUrl: string | undefined = undefined

        if (typeof firstImage === 'string') {
          imageUrl = firstImage
        } else if (typeof firstImage === 'object' && firstImage.url) {
          imageUrl = firstImage.url
        }

        if (imageUrl) {
          metadata.openGraph = {
            images: [{ url: imageUrl, width: 1200, height: 630 }] // Standard OG image dimensions
          }
        }
      }
    }
  }
  // If no image is found, metadata.openGraph.images will remain undefined,
  // allowing fallback to parent or global OG image settings.
  return metadata
}

export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const userId = await getCurrentUserId()
  const { id } = await props.params
  const chat = await getChat(id)
  // convertToUIMessages for useChat hook
  const messages = convertToUIMessages(chat?.messages || [])

  if (!chat) {
    redirect('/')
  }

  if (chat?.userId !== userId && chat?.userId !== 'anonymous') {
    notFound()
  }

  return (
    <ChatErrorBoundary>
      <Chat key={id} id={id} savedMessages={messages} />
    </ChatErrorBoundary>
  )
}
