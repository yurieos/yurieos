import Link from 'next/link'

import type { LucideIcon } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

interface AuthenticatedSidebarLinkProps {
  /** The URL path to link to */
  href: string
  /** The icon component to display */
  icon: LucideIcon
  /** The label text to display */
  label: string
  /** Tooltip text (shown when sidebar is collapsed) */
  tooltip?: string
}

/**
 * Sidebar link that only renders when:
 * 1. Supabase is configured
 * 2. User is authenticated
 *
 * Use this for protected feature links in the sidebar.
 */
export async function AuthenticatedSidebarLink({
  href,
  icon: Icon,
  label,
  tooltip
}: AuthenticatedSidebarLinkProps) {
  if (!isSupabaseConfigured()) {
    return null
  }

  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={tooltip || label}>
        <Link href={href} className="flex items-center gap-2">
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
