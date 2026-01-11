import { Suspense } from 'react'
import Link from 'next/link'

import { User } from '@supabase/supabase-js'
import { FileText, FolderHeart, ImageIcon } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

// Notes link - only shown for authenticated users when Supabase is configured
async function NotesLink() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Notes">
        <Link href="/notes" className="flex items-center gap-2">
          <FileText className="size-4" />
          <span>Notes</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
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

// Imagine link - only shown for authenticated users when Supabase is configured
async function ImagineLink() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Imagine">
        <Link href="/imagine" className="flex items-center gap-2">
          <ImageIcon className="size-4" />
          <span>Imagine</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
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
            <NotesLink />
          </Suspense>
          <Suspense fallback={null}>
            <ImagineLink />
          </Suspense>
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
      {user && (
        <SidebarFooter className="px-2 pb-2 pt-0">
          <SidebarUserMenu user={user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
