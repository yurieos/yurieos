'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { AlertTriangle, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

// ============================================
// Types
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  variant?: 'default' | 'editor' | 'minimal'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ============================================
// Notes Error Boundary Component
// ============================================

export class NotesErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('NotesErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          variant={this.props.variant || 'default'}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

// ============================================
// Error Fallback Component
// ============================================

interface ErrorFallbackProps {
  error: Error | null
  variant: 'default' | 'editor' | 'minimal'
  onReset: () => void
}

function ErrorFallback({ error, variant, onReset }: ErrorFallbackProps) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 p-2 text-sm text-destructive">
        <AlertTriangle className="size-4" />
        <span>Something went wrong</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7">
          Retry
        </Button>
      </div>
    )
  }

  const messages = {
    default: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again.'
    },
    editor: {
      title: 'Editor failed to load',
      description:
        'There was a problem loading the note editor. Your changes may not have been saved.'
    }
  }

  const message = messages[variant]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 rounded-lg',
        'border border-destructive/30 bg-destructive/5',
        'min-h-[200px]'
      )}
    >
      <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-6 text-destructive" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {message.title}
      </h3>

      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
        {message.description}
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={onReset} className="gap-2">
          <RefreshCw className="size-4" />
          Try again
        </Button>

        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
      </div>

      {/* Error details (development only) */}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 w-full max-w-lg">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 p-3 bg-muted/50 rounded-md text-xs overflow-x-auto">
            <code>{error.message}</code>
            {error.stack && (
              <>
                {'\n\n'}
                <code className="text-muted-foreground">{error.stack}</code>
              </>
            )}
          </pre>
        </details>
      )}
    </div>
  )
}

// ============================================
// Specialized Error Boundaries
// ============================================

/**
 * Error boundary specifically for the note editor
 */
export function EditorErrorBoundary({
  children,
  onReset
}: {
  children: ReactNode
  onReset?: () => void
}) {
  return (
    <NotesErrorBoundary variant="editor" onReset={onReset}>
      {children}
    </NotesErrorBoundary>
  )
}

/**
 * Minimal error boundary for inline components
 */
export function MinimalErrorBoundary({
  children,
  onReset
}: {
  children: ReactNode
  onReset?: () => void
}) {
  return (
    <NotesErrorBoundary variant="minimal" onReset={onReset}>
      {children}
    </NotesErrorBoundary>
  )
}
