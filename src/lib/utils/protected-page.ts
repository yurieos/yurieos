import { redirect } from 'next/navigation'

import type { User } from '@supabase/supabase-js'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * Result of checking protected page access
 */
export type ProtectedAccessResult =
  | { status: 'not-configured' }
  | { status: 'authenticated'; user: User }

/**
 * Check if a protected page should be accessible.
 * Handles Supabase configuration check and authentication.
 *
 * @param redirectPath - The path to redirect to after login (e.g., '/notes')
 * @returns The access result with user if authenticated
 *
 * @example
 * ```tsx
 * export default async function NotesPage() {
 *   const access = await checkProtectedAccess('/notes')
 *   if (access.status === 'not-configured') {
 *     return <NotAvailable feature="Notes" ... />
 *   }
 *   // access.user is available here
 * }
 * ```
 */
export async function checkProtectedAccess(
  redirectPath: string
): Promise<ProtectedAccessResult> {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return { status: 'not-configured' }
  }

  // Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/auth/login?redirect=${redirectPath}`)
  }

  return { status: 'authenticated', user }
}
