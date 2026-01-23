import Link from 'next/link'

export function AuthFooter() {
  return (
    <footer className="fixed bottom-4 left-0 right-0 z-50 pointer-events-none">
      <div className="flex w-full items-center justify-center gap-3 text-center text-xs text-muted-foreground/70 pointer-events-auto">
        <span>© 2026 Yurie</span>
        <span className="text-muted-foreground/50">|</span>
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacy
        </Link>
        <span className="text-muted-foreground/50">|</span>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms
        </Link>
      </div>
    </footer>
  )
}
