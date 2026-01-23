import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
} as const

type MaxWidth = keyof typeof maxWidthClasses

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional description below the title */
  description?: string
  /** Optional action element (e.g., button) */
  action?: ReactNode
}

/**
 * Page header component for consistent headers across pages
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold mb-0.5">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

interface PageLayoutProps {
  /** Page title */
  title: string
  /** Optional description below the title */
  description?: string
  /** Optional action element in the header (e.g., button) */
  action?: ReactNode
  /** Maximum width of the content */
  maxWidth?: MaxWidth
  /** Page content */
  children: ReactNode
  /** Optional additional CSS classes */
  className?: string
  /** Whether to show the header (default: true) */
  showHeader?: boolean
}

/**
 * Standardized page layout component for protected pages.
 * Provides consistent spacing, max-width, and header styling.
 *
 * @example
 * ```tsx
 * <PageLayout
 *   title="Notes"
 *   description="Your personal notes and documents"
 *   maxWidth="3xl"
 *   action={<Button>New Note</Button>}
 * >
 *   <NotesListClient />
 * </PageLayout>
 * ```
 */
export function PageLayout({
  title,
  description,
  action,
  maxWidth = '3xl',
  children,
  className,
  showHeader = true
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col w-full mx-auto px-4 sm:px-6 pt-16 pb-8',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {showHeader && (
        <PageHeader title={title} description={description} action={action} />
      )}
      {children}
    </div>
  )
}
