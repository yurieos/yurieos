'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Chat } from '@/lib/types'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

import { Spinner } from '../ui/spinner'

function formatDate(date: Date | string) {
  const d = new Date(date),
    now = new Date(),
    yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const time = d.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function ChatMenuItem({ chat }: { chat: Chat }) {
  const pathname = usePathname()
  const isActive = pathname === chat.path
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const onDelete = () =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/chat/${chat.id}`, { method: 'DELETE' })
        if (!res.ok)
          throw new Error((await res.json()).error || 'Failed to delete chat')
        toast.success('Chat deleted')
        setIsMenuOpen(false)
        setDialogOpen(false)
        if (isActive) router.push('/')
        window.dispatchEvent(new CustomEvent('chat-history-updated'))
      } catch (error) {
        toast.error((error as Error).message || 'Failed to delete chat')
        setIsMenuOpen(false)
        setDialogOpen(false)
      }
    })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-auto flex-col gap-0.5 items-start p-2 pr-8"
      >
        <Link href={chat.path}>
          <div className="text-xs font-medium truncate select-none w-full">
            {chat.title}
          </div>
          <div className="text-xs text-muted-foreground w-full">
            {formatDate(chat.createdAt)}
          </div>
        </Link>
      </SidebarMenuButton>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction disabled={isPending} className="size-7 p-1 mr-1">
            {isPending ? (
              <div className="flex items-center justify-center size-full">
                <Spinner />
              </div>
            ) : (
              <MoreHorizontal size={16} />
            )}
            <span className="sr-only">Chat Actions</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                disabled={isPending}
                className="gap-2 text-destructive focus:text-destructive"
                onSelect={e => e.preventDefault()}
              >
                <Trash2 className="size-3.5" />
                Delete Chat
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  this chat history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isPending}
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPending ? <Spinner /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
