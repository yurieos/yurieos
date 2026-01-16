'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { User } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'

import GuestMenu from './guest-menu'
import { ModelSelector } from './model-selector'
import { NewChatButton } from './new-chat-button'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open, isMobile } = useSidebar()
  const pathname = usePathname()

  const isOnChatPage = pathname === '/' || pathname.startsWith('/search')
  const showNewChatButton = pathname !== '/' && pathname.startsWith('/search')

  return (
    <header
      className={cn(
        'absolute top-0 right-0 p-2 flex justify-between items-center z-10 bg-background transition-[width] duration-200 ease-linear',
        open
          ? 'md:w-[calc(100%-var(--sidebar-width))]'
          : 'md:w-[calc(100%-var(--sidebar-width-icon))]',
        'w-full'
      )}
    >
      {/* Sidebar trigger for mobile only */}
      <div className="flex items-center gap-1">
        {isMobile && <SidebarTrigger className="size-8" />}
        {isMobile && (
          <Link
            href="/"
            className="flex items-center gap-2 h-8 px-2 rounded-full"
          >
            <span className="text-base leading-none">🧸</span>
            <span className="text-sm">Yurie</span>
          </Link>
        )}
        {isOnChatPage && <ModelSelector />}
        {showNewChatButton && <NewChatButton variant="header" />}
      </div>

      {/* Guest menu for non-logged in users (logged in users have avatar in sidebar) */}
      {!user && <GuestMenu />}
    </header>
  )
}

export default Header
