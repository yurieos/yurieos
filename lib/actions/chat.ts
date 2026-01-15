'use server'

import { revalidatePath } from 'next/cache'

import { deleteAttachmentsByChat } from '@/lib/actions/attachments'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import {
  getRedisClient,
  getSafeRedisClient,
  isRedisConfigured,
  RedisWrapper
} from '@/lib/redis/config'
import { type Chat } from '@/lib/types'

const getRedis = (): Promise<RedisWrapper> => getRedisClient()
const getSafeRedis = (): Promise<RedisWrapper | null> => getSafeRedisClient()
const getUserChatKey = (userId: string) => `user:v2:chat:${userId}`

/**
 * Raw chat data shape from Redis storage
 * Messages are stored as JSON string, dates as ISO strings
 */
interface RedisChatData {
  id?: string
  title?: string
  createdAt?: string | Date
  userId?: string
  path?: string
  messages?: string | unknown[] // JSON string or already parsed array
  [key: string]: unknown // Allow additional fields from Redis
}

function parseChat(data: RedisChatData | null): Chat | null {
  if (!data || Object.keys(data).length === 0) return null
  const chat = { ...data }
  if (typeof chat.messages === 'string') {
    try {
      chat.messages = JSON.parse(chat.messages)
    } catch {
      chat.messages = []
    }
  }
  if (chat.createdAt && !(chat.createdAt instanceof Date)) {
    chat.createdAt = new Date(chat.createdAt)
  }
  return chat as Chat
}

export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  if (!isRedisConfigured()) return { chats: [], nextOffset: null }
  try {
    const redis = await getSafeRedis()
    if (!redis) return { chats: [], nextOffset: null }
    const chatKeys = await redis.zrange(
      getUserChatKey(userId),
      offset,
      offset + limit - 1,
      { rev: true }
    )
    if (!chatKeys.length) return { chats: [], nextOffset: null }
    const results = await Promise.all(chatKeys.map(key => redis.hgetall(key)))
    const chats = results
      .map(data => parseChat(data as RedisChatData | null))
      .filter((c): c is Chat => c !== null)
    return {
      chats,
      nextOffset: chatKeys.length === limit ? offset + limit : null
    }
  } catch (error) {
    console.error('Error fetching chat page:', error)
    return { chats: [], nextOffset: null }
  }
}

export async function getChat(id: string): Promise<Chat | null> {
  if (!isRedisConfigured()) return null
  try {
    const redis = await getSafeRedis()
    if (!redis) return null
    const data = await redis.hgetall<RedisChatData>(`chat:${id}`)
    const chat = parseChat(data)
    if (chat && !Array.isArray(chat.messages)) chat.messages = []
    return chat
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export async function clearChats(): Promise<{ error?: string }> {
  if (!isRedisConfigured()) return { error: 'Chat history is not enabled' }
  try {
    const userId = await getCurrentUserId()
    const redis = await getRedis()
    const userKey = getUserChatKey(userId)
    const chats = await redis.zrange(userKey, 0, -1)
    if (!chats.length) return { error: 'No chats to clear' }

    // Delete attachments for all chats (best effort, don't block on failures)
    // Only delete if userId is not anonymous (authenticated user)
    if (userId !== 'anonymous') {
      for (const chatKey of chats) {
        // Extract chatId from key (format: "chat:{chatId}")
        const chatId = chatKey.replace('chat:', '')
        try {
          await deleteAttachmentsByChat(chatId, userId)
        } catch (attachmentError) {
          console.error(
            `Error deleting attachments for chat ${chatId}:`,
            attachmentError
          )
          // Continue with other chats even if one fails
        }
      }
    }

    const pipeline = redis.pipeline()
    for (const chat of chats) {
      pipeline.del(chat)
      pipeline.zrem(userKey, chat)
    }
    await pipeline.exec()
    revalidatePath('/')
    return {}
  } catch (error) {
    console.error('Error clearing chats:', error)
    return { error: 'Failed to clear chats' }
  }
}

export async function deleteChat(
  chatId: string,
  userId = 'anonymous'
): Promise<{ error?: string }> {
  if (!isRedisConfigured()) return { error: 'Chat history is not enabled' }
  try {
    const redis = await getRedis()
    const chatKey = `chat:${chatId}`
    const data = await redis.hgetall<RedisChatData>(chatKey)
    if (!data || !Object.keys(data).length) return { error: 'Chat not found' }

    // Delete attachments from Supabase Storage (best effort, don't block on failure)
    // Only delete if userId is not anonymous (authenticated user)
    if (userId !== 'anonymous') {
      try {
        await deleteAttachmentsByChat(chatId, userId)
      } catch (attachmentError) {
        console.error(
          `Error deleting attachments for chat ${chatId}:`,
          attachmentError
        )
        // Continue with chat deletion even if attachment cleanup fails
      }
    }

    const pipeline = redis.pipeline()
    pipeline.del(chatKey)
    pipeline.zrem(getUserChatKey(userId), chatKey)
    await pipeline.exec()
    revalidatePath('/')
    return {}
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error)
    return { error: 'Failed to delete chat' }
  }
}

export async function saveChat(chat: Chat, userId = 'anonymous') {
  if (!isRedisConfigured()) return null
  try {
    const redis = await getSafeRedis()
    if (!redis) return null
    const pipeline = redis.pipeline()
    pipeline.hmset(`chat:${chat.id}`, {
      ...chat,
      messages: JSON.stringify(chat.messages)
    })
    pipeline.zadd(getUserChatKey(userId), Date.now(), `chat:${chat.id}`)
    return await pipeline.exec()
  } catch (error) {
    console.error('Error saving chat:', error)
    return null
  }
}
