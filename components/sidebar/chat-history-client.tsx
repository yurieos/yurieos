'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { Chat } from '@/lib/types'

import { SidebarGroup, SidebarMenu } from '@/components/ui/sidebar'

import { ChatHistorySkeleton } from './chat-history-skeleton'
import { ChatMenuItem } from './chat-menu-item'
import { ClearHistoryAction } from './clear-history-action'

export function ChatHistoryClient() {
  const [chats, setChats] = useState<Chat[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  const fetchChats = useCallback(async (offset = 0, append = false) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/chats?offset=${offset}&limit=20`)
      if (!response.ok) throw new Error('Failed to fetch chat history')
      const { chats: newChats, nextOffset: newOffset } = await response.json()
      setChats(prev => (append ? [...prev, ...newChats] : newChats))
      setNextOffset(newOffset)
    } catch (error) {
      console.error('Failed to load chats:', error)
      toast.error('Failed to load chat history.')
      setNextOffset(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  useEffect(() => {
    const handleUpdate = () => startTransition(() => fetchChats())
    window.addEventListener('chat-history-updated', handleUpdate)
    return () =>
      window.removeEventListener('chat-history-updated', handleUpdate)
  }, [fetchChats])

  useEffect(() => {
    const ref = loadMoreRef.current
    if (!ref || nextOffset === null || isPending) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && !isPending)
          fetchChats(nextOffset, true)
      },
      { threshold: 0.1 }
    )
    observer.observe(ref)
    return () => {
      if (ref) observer.unobserve(ref)
    }
  }, [fetchChats, nextOffset, isLoading, isPending])

  const isEmpty = !isLoading && !chats.length && nextOffset === null

  return (
    <div className="flex flex-col flex-1 h-full">
      <SidebarGroup className="pb-0 pr-2">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="group/history flex items-center gap-1 p-0 text-xs font-medium text-sidebar-foreground/70 tracking-wide hover:text-sidebar-foreground transition-colors"
          >
            History
            {isCollapsed ? (
              <ChevronRight
                size={14}
                className="shrink-0 opacity-0 group-hover/history:opacity-100 transition-opacity"
              />
            ) : (
              <ChevronDown
                size={14}
                className="shrink-0 opacity-0 group-hover/history:opacity-100 transition-opacity"
              />
            )}
          </button>
          <ClearHistoryAction empty={isEmpty} />
        </div>
      </SidebarGroup>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto mb-2 relative scrollbar-thin pr-2">
          <SidebarMenu>
            {chats.map(
              chat => chat && <ChatMenuItem key={chat.id} chat={chat} />
            )}
          </SidebarMenu>
          <div ref={loadMoreRef} style={{ height: '1px' }} />
          {(isLoading || isPending) && (
            <div className="py-2">
              <ChatHistorySkeleton />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
