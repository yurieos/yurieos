'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  AlertCircle,
  Inbox,
  MessageSquare,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react'

import { Chat } from '@/lib/types'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Chat item content with title and timestamp
 */
function ChatItemContent({
  title,
  createdAt
}: {
  title: string
  createdAt: Date | string
}) {
  return (
    <>
      <MessageSquare className="mr-2 size-4 shrink-0" />
      <span className="truncate flex-1">{title}</span>
      <span className="ml-2 text-xs text-muted-foreground shrink-0">
        {formatChatTime(createdAt)}
      </span>
    </>
  )
}

/**
 * Skeleton loader for chat items in the search dialog
 */
function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <Skeleton className="size-4 rounded" />
      <Skeleton className="h-4 flex-1 rounded" />
      <Skeleton className="h-3 w-10 rounded" />
    </div>
  )
}

/**
 * Skeleton group with heading and multiple items
 */
function ChatGroupSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="p-1">
      <Skeleton className="h-3 w-16 mb-2 ml-2" />
      {Array.from({ length: count }).map((_, i) => (
        <ChatItemSkeleton key={i} />
      ))}
    </div>
  )
}

interface GroupedChats {
  today: Chat[]
  yesterday: Chat[]
  previousWeek: Chat[]
  older: Chat[]
}

function groupChatsByDate(chats: Chat[]): GroupedChats {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  return {
    today: chats.filter(c => new Date(c.createdAt) >= today),
    yesterday: chats.filter(c => {
      const d = new Date(c.createdAt)
      return d >= yesterday && d < today
    }),
    previousWeek: chats.filter(c => {
      const d = new Date(c.createdAt)
      return d >= weekAgo && d < yesterday
    }),
    older: chats.filter(c => new Date(c.createdAt) < weekAgo)
  }
}

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30000

/**
 * Format chat timestamp for display
 * - Today: shows time (e.g., "2:30 PM")
 * - This year: shows month/day (e.g., "Jan 15")
 * - Older: shows month/day/year (e.g., "Jan 15, 2024")
 */
function formatChatTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (d >= today) {
    // Today - show time
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (d.getFullYear() === now.getFullYear()) {
    // This year - show month/day
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  }

  // Older - show full date
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

interface ChatCache {
  chats: Chat[]
  timestamp: number
}

export function SearchChatsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<ChatCache | null>(null)

  const fetchChats = useCallback(
    async (forceRefresh = false) => {
      // Check cache validity (skip if force refresh)
      if (
        !forceRefresh &&
        cacheRef.current &&
        Date.now() - cacheRef.current.timestamp < CACHE_TTL
      ) {
        setChats(cacheRef.current.chats)
        return
      }

      // Cancel any in-flight request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/chats?offset=0&limit=100', {
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to fetch chats')
        }

        const { chats: fetchedChats } = await response.json()
        const validChats = fetchedChats || []

        // Update cache
        cacheRef.current = {
          chats: validChats,
          timestamp: Date.now()
        }

        setChats(validChats)
        setHasLoadedOnce(true)
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Failed to fetch chats for search:', err)
        setError(err instanceof Error ? err.message : 'Failed to load chats')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Invalidate cache (for external events)
  const invalidateCache = useCallback(() => {
    cacheRef.current = null
  }, [])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Fetch chats when dialog opens
  useEffect(() => {
    if (open) {
      fetchChats()
    }
  }, [open, fetchChats])

  // Listen for chat history updates to invalidate cache
  useEffect(() => {
    const handleChatUpdate = () => {
      invalidateCache()
      // If dialog is open, refresh immediately
      if (open) {
        fetchChats(true)
      }
    }

    window.addEventListener('chat-history-updated', handleChatUpdate)
    return () => {
      window.removeEventListener('chat-history-updated', handleChatUpdate)
    }
  }, [open, fetchChats, invalidateCache])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = (chatId: string) => {
    setOpen(false)
    router.push(`/search/${chatId}`)
  }

  const handleNewChat = () => {
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const groupedChats = groupChatsByDate(chats)

  return (
    <>
      <SidebarMenuButton
        onClick={() => setOpen(true)}
        className="group/btn"
        tooltip="Search chats"
      >
        <Search className="size-4" />
        <span className="flex-1">Search chats</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground opacity-0 group-hover/btn:opacity-100 transition-opacity">
          <span className="text-base">⌘</span>
          <span>K</span>
        </kbd>
      </SidebarMenuButton>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <DialogDescription className="sr-only">
          Search through your chat history
        </DialogDescription>
        <CommandInput placeholder="Search chats..." />
        <CommandList>
          <CommandEmpty>
            {error ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" />
                  <span className="text-sm">{error}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    fetchChats(true)
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="size-3" />
                  Try again
                </Button>
              </div>
            ) : hasLoadedOnce && chats.length === 0 ? (
              // No chats exist yet
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Inbox className="size-8 opacity-50" />
                <span className="text-sm">No chat history yet</span>
                <span className="text-xs">
                  Start a conversation to see it here
                </span>
              </div>
            ) : chats.length > 0 ? (
              // Has chats but search found no matches
              <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
                <span className="text-sm">No matching chats</span>
                <span className="text-xs">
                  Try a different search term
                </span>
              </div>
            ) : (
              // Initial loading state
              'Loading...'
            )}
          </CommandEmpty>

          {/* Loading skeletons - shown when loading and no cached data */}
          {isLoading && chats.length === 0 && (
            <>
              <ChatGroupSkeleton count={2} />
              <ChatGroupSkeleton count={3} />
            </>
          )}

          {/* New chat option */}
          <CommandGroup>
            <CommandItem onSelect={handleNewChat}>
              <Plus className="mr-2 size-4" />
              <span>New chat</span>
            </CommandItem>
          </CommandGroup>

          {/* Today */}
          {groupedChats.today.length > 0 && (
            <CommandGroup heading={`Today (${groupedChats.today.length})`}>
              {groupedChats.today.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <ChatItemContent title={chat.title} createdAt={chat.createdAt} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Yesterday */}
          {groupedChats.yesterday.length > 0 && (
            <CommandGroup heading={`Yesterday (${groupedChats.yesterday.length})`}>
              {groupedChats.yesterday.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <ChatItemContent title={chat.title} createdAt={chat.createdAt} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Previous 7 Days */}
          {groupedChats.previousWeek.length > 0 && (
            <CommandGroup
              heading={`Previous 7 Days (${groupedChats.previousWeek.length})`}
            >
              {groupedChats.previousWeek.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <ChatItemContent title={chat.title} createdAt={chat.createdAt} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Older */}
          {groupedChats.older.length > 0 && (
            <CommandGroup heading={`Older (${groupedChats.older.length})`}>
              {groupedChats.older.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <ChatItemContent title={chat.title} createdAt={chat.createdAt} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Keyboard hints */}
          {chats.length > 0 && (
            <div className="flex items-center justify-center gap-4 px-2 py-2 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                  ↑↓
                </kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                  ↵
                </kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                  esc
                </kbd>
                <span>close</span>
              </span>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
