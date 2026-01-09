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
          'min-h-screen bg-background font-sans antialiased overflow-x-hidden',
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
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background">
              <div className="w-full max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
                >
                  <span role="img" aria-label="Yurie mascot">
                    🧸
                  </span>
                  <span>Yurie</span>
                </Link>
                <nav className="flex items-center gap-2">
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/"
                    className="text-sm text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
                  >
                    Open App
                  </Link>
                </nav>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="border-t bg-muted/30">
              <div className="container max-w-3xl mx-auto px-4 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span role="img" aria-label="Yurie mascot">
                      🧸
                    </span>
                    <span>Yurie &copy; {new Date().getFullYear()}</span>
                  </div>
                  <nav className="flex items-center gap-4">
                    <Link href="/privacy" className="hover:text-foreground">
                      Privacy
                    </Link>
                    <Link href="/terms" className="hover:text-foreground">
                      Terms
                    </Link>
                    <a
                      href="mailto:os@yurie.ai"
                      className="hover:text-foreground"
                    >
                      Contact
                    </a>
                  </nav>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
