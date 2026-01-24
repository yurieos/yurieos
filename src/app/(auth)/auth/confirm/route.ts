import { type NextRequest, NextResponse } from 'next/server'

import { type CookieOptions, createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=Supabase not configured`
      )
    }

    // Create a response object that we can attach cookies to
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: CookieOptions
          }[]
        ) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        }
      }
    })

    const { error, data } = await supabase.auth.verifyOtp({
      type,
      token_hash
    })
    if (!error && data.session) {
      // Explicitly set the session to trigger setAll callback and persist cookies
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
      // redirect user to specified redirect URL or root of app
      return response
    }
    // redirect the user to an error page with some instructions
    const errorMessage = error?.message ?? 'Verification failed'
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(errorMessage)}`
    )
  }

  // redirect the user to an error page with some instructions
  return NextResponse.redirect(
    `${origin}/auth/error?error=No token hash or type`
  )
}
