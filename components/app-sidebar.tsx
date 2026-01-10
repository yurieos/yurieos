import { Suspense } from 'react'
import Link from 'next/link'

import { FolderHeart } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import {
  ChatHistoryClient,
  ChatHistorySkeleton
} from './sidebar/chat-history-client'
import { NewChatButton } from './new-chat-button'
import { SearchChatsButton } from './search-chats-button'

// Inlined from chat-history-section.tsx - checks env and renders client
async function ChatHistorySection() {
  const enableSaveChatHistory = process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
  if (!enableSaveChatHistory) {
    return null
  }
  return <ChatHistoryClient />
}

// Your Stuff link - only shown for authenticated users when Supabase is configured
async function YourStuffLink() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Your stuff">
        <Link href="/stuff" className="flex items-center gap-2">
          <FolderHeart className="size-4" />
          <span>Your stuff</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export default function AppSidebar() {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex flex-row justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 h-8 px-2 rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center"
        >
          <span className="text-base leading-none">🧸</span>
          <span className="text-sm group-data-[collapsible=icon]:hidden">Yurie</span>
        </Link>
        <SidebarTrigger className="size-8 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 pt-1 pb-4 h-full">
        <SidebarMenu>
          <SidebarMenuItem>
            <NewChatButton variant="sidebar" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>
          <Suspense fallback={null}>
            <YourStuffLink />
          </Suspense>
        </SidebarMenu>
        <div className="flex-1 overflow-y-auto group-data-[collapsible=icon]:hidden">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
