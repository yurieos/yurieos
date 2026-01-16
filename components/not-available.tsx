import { type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface NotAvailableProps {
  /** The feature name (e.g., "Notes", "Image generation") */
  feature: string
  /** Description explaining why the feature is not available */
  description: string
  /** Optional icon to display */
  icon?: LucideIcon
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Consistent "Not Available" UI for features that require configuration.
 * Used when Supabase is not configured for protected pages.
 *
 * @example
 * ```tsx
 * <NotAvailable
 *   feature="Notes"
 *   description="Notes require Supabase to be configured. Please set up your environment variables."
 *   icon={FileText}
 * />
 * ```
 */
export function NotAvailable({
  feature,
  description,
  icon: Icon,
  className
}: NotAvailableProps) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center p-8',
        className
      )}
    >
      <div className="text-center max-w-md animate-fade-in">
        {Icon && (
          <div className="size-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
            <Icon className="size-10 text-muted-foreground/40" />
          </div>
        )}
        <h1 className="text-2xl font-semibold mb-3">Not Available</h1>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
