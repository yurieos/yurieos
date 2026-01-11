import { Telescope } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ResearchMode } from '@/components/chat'

interface DeepResearchToggleProps {
  isActive: boolean
  onToggle: () => void
  disabled?: boolean
}

/**
 * Deep Research Toggle Button Component
 * Uses official Gemini Deep Research Agent via Interactions API
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */
export function DeepResearchToggle({
  isActive,
  onToggle,
  disabled = false
}: DeepResearchToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg',
        'text-xs font-medium transition-colors duration-200',
        'border border-input bg-background',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Telescope size={14} />
      <span>Research</span>
    </button>
  )
}

export type { ResearchMode }
