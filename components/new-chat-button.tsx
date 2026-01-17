'use client'

import { useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface NewChatButtonProps {
  variant: 'header' | 'sidebar'
  className?: string
}

export function NewChatButton({ variant, className }: NewChatButtonProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleNewChat = useCallback(() => {
    if (pathname === '/') {
      // Already on home page - force refresh to get new chat ID
      router.refresh()
    } else {
      // Navigate to home and refresh to ensure fresh state
      router.push('/')
      router.refresh()
    }
  }, [pathname, router])

  // Keyboard shortcut: Cmd+O / Ctrl+O
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'o') {
        e.preventDefault()
        handleNewChat()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleNewChat])

  if (variant === 'header') {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={handleNewChat}
              className={cn('size-8 p-0', className)}
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Sidebar variant
  return (
    <SidebarMenuButton asChild tooltip="New chat">
      <button
        onClick={handleNewChat}
        className={cn('group/btn flex items-center gap-2 w-full', className)}
      >
        <Plus className="size-4" />
        <span className="flex-1">New chat</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground opacity-0 group-hover/btn:opacity-100 transition-opacity">
          <span className="text-base">⌘</span>
          <span>O</span>
        </kbd>
      </button>
    </SidebarMenuButton>
  )
}
