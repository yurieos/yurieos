import { notFound, redirect } from 'next/navigation'

import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/get-current-user'
import { convertToUIMessages } from '@/lib/utils'

import { Chat } from '@/components/chat'
import { ChatErrorBoundary } from '@/components/error-boundary'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const chat = await getChat(id)

  return {
    title: chat?.title?.toString().slice(0, 50) || 'Search'
  }
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
