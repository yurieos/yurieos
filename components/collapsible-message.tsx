import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'

interface CollapsibleMessageProps {
  children: React.ReactNode
  role: 'user' | 'assistant'
  isCollapsible?: boolean
  isOpen?: boolean
  header?: React.ReactNode
  onOpenChange?: (open: boolean) => void
  showIcon?: boolean
}

export function CollapsibleMessage({
  children,
  role,
  isCollapsible = false,
  isOpen = true,
  header,
  onOpenChange,
  showIcon = true
}: CollapsibleMessageProps) {
  const content = (
    <div className={cn(role === 'assistant' ? 'flex-1 min-w-0' : '')}>
      {children}
    </div>
  )

  return (
    <div className={cn('flex min-w-0', role === 'user' && 'justify-end')}>
      {showIcon && role === 'assistant' && (
        <div className="relative flex flex-col items-center">
          <div className="w-5">
            <span className="text-lg">🧸</span>
          </div>
        </div>
      )}

      {isCollapsible ? (
        <div className="flex-1 min-w-0 py-1.5">
          <Collapsible
            open={isOpen}
            onOpenChange={onOpenChange}
            className="w-full"
          >
            <div className="flex items-center justify-between w-full gap-2">
              {header && <div className="flex-1 min-w-0">{header}</div>}
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 hover:bg-muted/60 transition-colors flex-shrink-0"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown
                    size={14}
                    className={cn(
                      'text-muted-foreground/60 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
              <div className="mt-3">{content}</div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : (
        <div
          className={cn(
            'min-w-0',
            role === 'assistant'
              ? 'flex-1'
              : 'bg-primary/10 px-4 py-2.5 rounded-3xl'
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
