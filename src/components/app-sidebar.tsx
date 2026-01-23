import Link from 'next/link'
import { Suspense } from 'react'

import type { User } from '@supabase/supabase-js'

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

import { CollapsedSidebarTrigger } from './collapsed-sidebar-trigger'
import { NewChatButton } from './new-chat-button'
import { SidebarUserMenu } from './sidebar-user-menu'
import {
  ChatHistoryClient,
  ChatHistorySkeleton
} from './sidebar/chat-history-client'

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
          className="flex items-center gap-2 h-8 px-2 rounded-full group-data-[collapsible=icon]:hidden"
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
