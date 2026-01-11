'use client'

import Link from 'next/link'

import { ChevronRight, FileText, Home, PanelLeft } from 'lucide-react'

import type { Note } from '@/lib/types/notes'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

// ============================================
// Types
// ============================================

interface NoteBreadcrumbProps {
  note: Note
}

// ============================================
// Note Breadcrumb Component
// ============================================

export function NoteBreadcrumb({ note }: NoteBreadcrumbProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="flex items-center pl-1.5 pr-2 py-2 min-h-[44px]"
        aria-label="Breadcrumb"
      >
        {/* Mobile sidebar trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-8 mr-1 md:hidden shrink-0',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-accent/60'
              )}
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <PanelLeft className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Open sidebar</p>
          </TooltipContent>
        </Tooltip>

        <ol className="flex items-center">
          {/* Home */}
          <li className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/notes"
                  className={cn(
                    'flex items-center justify-center size-8 rounded-lg',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-accent/60 transition-colors duration-150'
                  )}
                >
                  <Home className="size-4" />
                  <span className="sr-only">Notes</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p>All notes</p>
              </TooltipContent>
            </Tooltip>
          </li>

          {/* Separator */}
          <li className="flex items-center">
            <ChevronRight
              className="size-3.5 text-muted-foreground/40 mx-1 shrink-0"
              aria-hidden="true"
            />
          </li>

          {/* Current Note */}
          <li className="flex items-center">
            <span
              className="flex items-center gap-1.5 text-foreground font-medium max-w-[200px] sm:max-w-[280px]"
              aria-current="page"
            >
              {note.icon ? (
                <span className="shrink-0 text-[13px] leading-none select-none">
                  {note.icon}
                </span>
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
              )}
              <span className="truncate text-[13px]">
                {note.title || 'Untitled'}
              </span>
            </span>
          </li>
        </ol>
      </nav>
    </TooltipProvider>
  )
}
