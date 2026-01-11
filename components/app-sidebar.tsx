import { Suspense } from 'react'
import Link from 'next/link'

import { User } from '@supabase/supabase-js'
import { FolderHeart, ImageIcon } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import { AuthenticatedSidebarLink } from './sidebar/auth-link'
import {
  ChatHistoryClient,
  ChatHistorySkeleton
} from './sidebar/chat-history-client'
import { CollapsedSidebarTrigger } from './collapsed-sidebar-trigger'
import { NewChatButton } from './new-chat-button'
import { SearchChatsButton } from './search-chats-button'
import { SidebarUserMenu } from './sidebar-user-menu'

// Inlined from chat-history-section.tsx - checks env and renders client
async function ChatHistorySection() {
  const enableSaveChatHistory = process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
  if (!enableSaveChatHistory) {
    return null
  }
  return <ChatHistoryClient />
}

interface AppSidebarProps {
  user: User | null
}

export default function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex flex-row justify-between items-center">
        {/* Expanded state: show full link with text */}
        <Link
          href="/"
          className="flex items-center gap-2 h-8 px-2 rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
        >
          <span className="text-base leading-none">🧸</span>
          <span className="text-sm">Yurie</span>
        </Link>
        {/* Collapsed state: bear emoji that reveals sidebar toggle on hover */}
        <CollapsedSidebarTrigger />
        <SidebarTrigger className="size-8 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 pt-1 pb-1 h-full">
        <SidebarMenu>
          <SidebarMenuItem>
            <NewChatButton variant="sidebar" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>
          <Suspense fallback={null}>
            <AuthenticatedSidebarLink
              href="/imagine"
              icon={ImageIcon}
              label="Imagine"
            />
          </Suspense>
          <Suspense fallback={null}>
            <AuthenticatedSidebarLink
              href="/stuff"
              icon={FolderHeart}
              label="Your stuff"
            />
          </Suspense>
        </SidebarMenu>
        <div className="flex-1 overflow-y-auto group-data-[collapsible=icon]:hidden">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>
      {user && (
        <SidebarFooter className="px-2 pb-2 pt-0">
          <SidebarUserMenu user={user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
