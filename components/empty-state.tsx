import { ReactNode } from 'react'

import { type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Optional icon to display */
  icon?: LucideIcon
  /** Optional action button */
  action?: ReactNode
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Base EmptyState component for displaying empty/error states.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={FileText}
 *   title="No notes yet"
 *   description="Create your first note to get started."
 *   action={<Button>Create Note</Button>}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center p-8',
        className
      )}
    >
      <div className="text-center max-w-md animate-fade-in">
        {Icon && (
          <div className="size-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center border border-muted-foreground/10">
            <Icon className="size-10 text-muted-foreground/40" />
          </div>
        )}
        <h2 className="text-2xl font-semibold mb-3">{title}</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          {description}
        </p>
        {action}
      </div>
    </div>
  )
}
