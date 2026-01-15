'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { Search } from 'lucide-react'

import { SidebarMenuButton } from '@/components/ui/sidebar'

const SearchChatsDialog = dynamic(
  () => import('./search-chats-dialog').then(mod => mod.SearchChatsDialog),
  { ssr: false }
)

export function SearchChatsButton() {
  const [open, setOpen] = useState(false)

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
      {open && <SearchChatsDialog open={open} onOpenChange={setOpen} />}
    </>
  )
}
