import { type NextRequest, NextResponse } from 'next/server'

import { type CookieOptions, createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=Supabase not configured`
      )
    }

    // Create a response object that we can attach cookies to
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    let redirectUrl = `${origin}${next}`
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    }

    const response = NextResponse.redirect(redirectUrl)

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

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Explicitly set the session to trigger setAll callback and persist cookies
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
