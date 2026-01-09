import type { Metadata } from 'next'
import { IBM_Plex_Mono, Libre_Baskerville, Lora } from 'next/font/google'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { ThemeProvider } from '@/components/theme-provider'

import '../globals.css'

const fontSans = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans'
})

const fontSerif = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif'
})

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.yurie.ai')
}

export default function LegalLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable,
          fontSerif.variable,
          fontMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <Link
                href="/"
                className="text-xl font-semibold hover:opacity-80"
              >
                Yurie
              </Link>
            </div>
          </header>
          <main>{children}</main>
          <footer className="border-t mt-12">
            <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-muted-foreground">
              <div className="flex gap-4">
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:underline">
                  Terms of Service
                </Link>
                <Link href="/" className="hover:underline">
                  Back to App
                </Link>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
