'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { MessageSquare, Plus, Search } from 'lucide-react'

import { Chat } from '@/lib/types'

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

export function SearchChatsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchChats = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch a larger batch for search
      const response = await fetch('/api/chats?offset=0&limit=100')
      if (!response.ok) throw new Error('Failed to fetch chats')
      const { chats: fetchedChats } = await response.json()
      setChats(fetchedChats)
    } catch (error) {
      console.error('Failed to fetch chats for search:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch chats when dialog opens
  useEffect(() => {
    if (open) {
      fetchChats()
    }
  }, [open, fetchChats])

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
      <SidebarMenuButton onClick={() => setOpen(true)} className="group/btn">
        <Search size={18} />
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
            {isLoading ? 'Loading...' : 'No chats found.'}
          </CommandEmpty>

          {/* New chat option */}
          <CommandGroup>
            <CommandItem onSelect={handleNewChat}>
              <Plus className="mr-2 size-4" />
              <span>New chat</span>
            </CommandItem>
          </CommandGroup>

          {/* Today */}
          {groupedChats.today.length > 0 && (
            <CommandGroup heading="Today">
              {groupedChats.today.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={chat.title}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  <span className="truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Yesterday */}
          {groupedChats.yesterday.length > 0 && (
            <CommandGroup heading="Yesterday">
              {groupedChats.yesterday.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={chat.title}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  <span className="truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Previous 7 Days */}
          {groupedChats.previousWeek.length > 0 && (
            <CommandGroup heading="Previous 7 Days">
              {groupedChats.previousWeek.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={chat.title}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  <span className="truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Older */}
          {groupedChats.older.length > 0 && (
            <CommandGroup heading="Older">
              {groupedChats.older.map(chat => (
                <CommandItem
                  key={chat.id}
                  value={chat.title}
                  onSelect={() => handleSelect(chat.id)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  <span className="truncate">{chat.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
