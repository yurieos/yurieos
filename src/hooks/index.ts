'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

// ============================================
// useIsMobile
// ============================================

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}

// ============================================
// useCopyToClipboard
// ============================================

export interface useCopyToClipboardProps {
  timeout?: number
}

export function useCopyToClipboard({
  timeout = 2000
}: useCopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState<boolean>(false)

  const copyToClipboard = (value: string) => {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }

    if (!value) {
      return
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true)

      setTimeout(() => {
        setIsCopied(false)
      }, timeout)
    })
  }

  return { isCopied, copyToClipboard }
}

// ============================================
// useIsAuthenticated
// ============================================

/**
 * Check if the current user is authenticated
 * Returns true if user has an active session, false otherwise
 * Safely returns false if Supabase is not configured
 */
export const useIsAuthenticated = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Skip if Supabase is not configured (default state is already false)
    if (!isSupabaseConfigured()) {
      return
    }

    const checkAuth = async () => {
      try {
        const { data } = await createClient().auth.getSession()
        setIsAuthenticated(!!data.session?.user)
      } catch {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  return isAuthenticated
}

// ============================================
// useLogout
// ============================================

/**
 * Hook that returns a logout function
 * Handles signing out and redirecting to home
 */
export function useLogout() {
  const router = useRouter()

  return useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [router])
}
