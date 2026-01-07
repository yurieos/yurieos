'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

import GuestMenu from './guest-menu'
import { ModelSelector } from './model-selector'
import UserMenu from './user-menu'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open, isMobile } = useSidebar()
  const pathname = usePathname()

  const isOnChatPage = pathname !== '/'

  return (
    <header
      className={cn(
        'absolute top-0 right-0 p-2 flex justify-between items-center z-10 backdrop-blur bg-background/80 transition-[width] duration-200 ease-linear',
        open ? 'md:w-[calc(100%-var(--sidebar-width))]' : 'md:w-full',
        'w-full'
      )}
    >
      {/* Sidebar trigger for mobile or when sidebar is closed, plus model selector */}
      <div className="flex items-center gap-[3px]">
        {(isMobile || !open) && <SidebarTrigger className="size-8" />}
        <ModelSelector />
        {isOnChatPage && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="size-8 group"
                >
                  <Link href="/">
                    <Plus size={18} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>New chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {user ? <UserMenu user={user} /> : <GuestMenu />}
    </header>
  )
}

export default Header
