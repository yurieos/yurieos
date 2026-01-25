'use client'

import * as React from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@/lib/utils/index'

const Popover = PopoverPrimitive.Root

// Wrapper to support asChild prop for backward compatibility
interface PopoverTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return <PopoverPrimitive.Trigger ref={ref} render={children} {...props} />
    }
    return (
      <PopoverPrimitive.Trigger ref={ref} {...props}>
        {children}
      </PopoverPrimitive.Trigger>
    )
  }
)
PopoverTrigger.displayName = 'PopoverTrigger'

// Base UI doesn't have Anchor - the trigger serves as the anchor
// Export a noop component for backward compatibility
const PopoverAnchor = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
))
PopoverAnchor.displayName = 'PopoverAnchor'

interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { className, align = 'center', sideOffset = 4, side = 'bottom', ...props },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        side={side}
      >
        <PopoverPrimitive.Popup
          ref={ref}
          className={cn(
            'z-50 w-72 rounded-3xl border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform] duration-200 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
)
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
