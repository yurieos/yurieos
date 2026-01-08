import { Suspense } from 'react'
import Link from 'next/link'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import { ChatHistorySection } from './sidebar/chat-history-section'
import { ChatHistorySkeleton } from './sidebar/chat-history-skeleton'
import { NewChatButton } from './new-chat-button'

export default function AppSidebar() {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 px-2 py-0.5">
          <span className="text-lg">🧸</span>
          <span className="font-semibold text-sm">Yurie</span>
        </Link>
        <SidebarTrigger className="size-8" />
      </SidebarHeader>
      <SidebarContent className="flex flex-col pl-2 pr-0 py-4 h-full">
        <SidebarMenu className="pr-2">
          <SidebarMenuItem>
            <NewChatButton variant="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
