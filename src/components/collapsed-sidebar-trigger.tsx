'use client'

import Link from 'next/link'

import { PanelLeft } from 'lucide-react'

import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

export function CollapsedSidebarTrigger() {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="group/trigger relative hidden group-data-[collapsible=icon]:flex items-center justify-center size-8">
      {/* Bear emoji - visible by default, hidden on hover */}
      <Link
        href="/"
        className="flex items-center justify-center size-8 transition-colors rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-hover/trigger:opacity-0 group-hover/trigger:pointer-events-none"
      >
        <span className="text-base leading-none">🧸</span>
      </Link>
      {/* Sidebar toggle icon - hidden by default, visible on hover */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute inset-0 flex items-center justify-center size-8 transition-colors rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground opacity-0 group-hover/trigger:opacity-100 cursor-e-resize"
            aria-label="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Open</TooltipContent>
      </Tooltip>
    </div>
  )
}
