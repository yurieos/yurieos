'use client'

import * as React from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils/index'

// Wrapper for TooltipProvider to support delayDuration prop (Radix compatibility)
interface TooltipProviderProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {
  delayDuration?: number
}

const TooltipProvider = ({ delayDuration, ...props }: TooltipProviderProps) => (
  <TooltipPrimitive.Provider delay={delayDuration} {...props} />
)

const Tooltip = TooltipPrimitive.Root

// Wrapper to support asChild prop for backward compatibility
interface TooltipTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return <TooltipPrimitive.Trigger ref={ref} render={children} {...props} />
    }
    return (
      <TooltipPrimitive.Trigger ref={ref} {...props}>
        {children}
      </TooltipPrimitive.Trigger>
    )
  }
)
TooltipTrigger.displayName = 'TooltipTrigger'

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> {
  sideOffset?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    { className, sideOffset = 4, side = 'top', align = 'center', ...props },
    ref
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        sideOffset={sideOffset}
        side={side}
        align={align}
      >
        <TooltipPrimitive.Popup
          ref={ref}
          className={cn(
            'z-50 overflow-hidden rounded-full border bg-popover px-1.5 py-0.5 text-[10px] text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
)
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
