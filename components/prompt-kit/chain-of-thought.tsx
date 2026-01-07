'use client'

import React from 'react'

import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils/index'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

export type ChainOfThoughtItemProps = React.ComponentProps<'div'>

export const ChainOfThoughtItem = ({
  children,
  className,
  ...props
}: ChainOfThoughtItemProps) => (
  <div className={cn('text-muted-foreground text-sm', className)} {...props}>
    {children}
  </div>
)

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode
  swapIconOnHover?: boolean
}

export const ChainOfThoughtTrigger = ({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: ChainOfThoughtTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      'group text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-start gap-1 text-left text-sm transition-colors',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      {/* Dot on the left */}
      <span className="relative inline-flex size-4 items-center justify-center">
        {leftIcon || <span className="size-2 rounded-full bg-current" />}
      </span>
      <span>{children}</span>
    </div>
    {/* Arrow on the right - points right when closed, down when open */}
    <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
  </CollapsibleTrigger>
)

export type ChainOfThoughtContentProps = React.ComponentProps<
  typeof CollapsibleContent
>

export const ChainOfThoughtContent = ({
  children,
  className,
  ...props
}: ChainOfThoughtContentProps) => {
  return (
    <CollapsibleContent
      className={cn(
        'text-popover-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
        <div className="bg-primary/20 ml-1.75 h-full w-px group-data-[last=true]:hidden" />
        <div className="ml-1.75 h-full w-px bg-transparent group-data-[last=false]:hidden" />
        <div className="mt-2 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  )
}

export type ChainOfThoughtProps = {
  children: React.ReactNode
  className?: string
}

export function ChainOfThought({ children, className }: ChainOfThoughtProps) {
  const childrenArray = React.Children.toArray(children)

  return (
    <div className={cn('space-y-0', className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {React.isValidElement(child) &&
            React.cloneElement(
              child as React.ReactElement<ChainOfThoughtStepProps>,
              {
                isLast: index === childrenArray.length - 1
              }
            )}
        </React.Fragment>
      ))}
    </div>
  )
}

export type ChainOfThoughtStepProps = {
  children: React.ReactNode
  className?: string
  isLast?: boolean
}

export const ChainOfThoughtStep = ({
  children,
  className,
  isLast = false,
  ...props
}: ChainOfThoughtStepProps & React.ComponentProps<typeof Collapsible>) => {
  return (
    <Collapsible
      className={cn('group animate-fade-in', className)}
      data-last={isLast}
      {...props}
    >
      {children}
      <div className="flex justify-start group-data-[last=true]:hidden">
        <div className="bg-primary/20 ml-1.75 h-4 w-px" />
      </div>
    </Collapsible>
  )
}
