'use client'

import { cn } from '@/lib/utils'

import { useSidebar } from '@/components/ui/sidebar'

export function Footer() {
  const { open } = useSidebar()

  return (
    <footer
      className={cn(
        'fixed bottom-4 right-0 z-50 pointer-events-none transition-[left] duration-200 ease-linear',
        open ? 'left-[var(--sidebar-width)]' : 'left-0'
      )}
    >
      <div className="flex items-center justify-center gap-3 text-center text-xs text-muted-foreground/70 pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <span className="text-sm">🧸</span>
          <span>© 2026 Yurie</span>
        </span>
        <span className="text-muted-foreground/50">|</span>
        <a href="/privacy" className="hover:text-foreground transition-colors">
          Privacy
        </a>
        <span className="text-muted-foreground/50">|</span>
        <a href="/terms" className="hover:text-foreground transition-colors">
          Terms
        </a>
      </div>
    </footer>
  )
}
