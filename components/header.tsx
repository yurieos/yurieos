'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

import { User } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

import GuestMenu from './guest-menu'
import { ModelSelector } from './model-selector'
import { NewChatButton } from './new-chat-button'
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
        {isOnChatPage && <NewChatButton variant="header" />}
      </div>

      {user ? <UserMenu user={user} /> : <GuestMenu />}
    </header>
  )
}

export default Header
