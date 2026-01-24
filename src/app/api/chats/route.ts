import { type NextRequest, NextResponse } from 'next/server'

import { getChatsPage } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/get-current-user'
import type { Chat } from '@/lib/types'

interface ChatPageResponse {
  chats: Chat[]
  nextOffset: number | null
  error?: string
  errorType?: 'disabled' | 'validation' | 'server'
}

// Maximum allowed values for pagination
const MAX_LIMIT = 100
const MAX_OFFSET = 10000

export async function GET(request: NextRequest) {
  const enableSaveChatHistory = process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
  if (!enableSaveChatHistory) {
    return NextResponse.json<ChatPageResponse>({
      chats: [],
      nextOffset: null,
      errorType: 'disabled'
    })
  }

  const { searchParams } = new URL(request.url)
  const offsetParam = searchParams.get('offset')
  const limitParam = searchParams.get('limit')

  // Parse and validate offset
  const offset = Number.parseInt(offsetParam || '0', 10)
  if (Number.isNaN(offset) || offset < 0 || offset > MAX_OFFSET) {
    return NextResponse.json<ChatPageResponse>(
      {
        chats: [],
        nextOffset: null,
        error: 'Invalid offset parameter',
        errorType: 'validation'
      },
      { status: 400 }
    )
  }

  // Parse and validate limit
  const limit = Number.parseInt(limitParam || '20', 10)
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json<ChatPageResponse>(
      {
        chats: [],
        nextOffset: null,
        error: `Limit must be between 1 and ${MAX_LIMIT}`,
        errorType: 'validation'
      },
      { status: 400 }
    )
  }

  const userId = await getCurrentUserId()

  try {
    const result = await getChatsPage(userId, limit, offset)
    return NextResponse.json<ChatPageResponse>(result)
  } catch (error) {
    console.error('API route error fetching chats:', error)

    // Determine error message based on error type
    let errorMessage = 'Failed to load chat history'
    if (error instanceof Error) {
      if (error.message.includes('Redis')) {
        errorMessage = 'Chat storage service is temporarily unavailable'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again'
      }
    }

    return NextResponse.json<ChatPageResponse>(
      {
        chats: [],
        nextOffset: null,
        error: errorMessage,
        errorType: 'server'
      },
      { status: 500 }
    )
  }
}
