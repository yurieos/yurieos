'use client'

import { useCallback } from 'react'
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

  const handleNewChat = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      if (pathname === '/') {
        // Already on home page - force refresh to get new chat ID
        router.refresh()
      } else {
        // Navigate to home and refresh to ensure fresh state
        router.push('/')
        router.refresh()
      }
    },
    [pathname, router]
  )

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
              <Plus size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>New chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Sidebar variant
  return (
    <SidebarMenuButton asChild>
      <button
        onClick={handleNewChat}
        className={cn('flex items-center gap-2 w-full', className)}
      >
        <Plus size={18} />
        <span>New chat</span>
      </button>
    </SidebarMenuButton>
  )
}
