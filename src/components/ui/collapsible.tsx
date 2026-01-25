'use client'

import * as React from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

const Collapsible = CollapsiblePrimitive.Root

// Wrapper to support asChild prop for backward compatibility
interface CollapsibleTriggerProps
  extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> {
  asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <CollapsiblePrimitive.Trigger ref={ref} render={children} {...props} />
    )
  }
  return (
    <CollapsiblePrimitive.Trigger ref={ref} {...props}>
      {children}
    </CollapsiblePrimitive.Trigger>
  )
})
CollapsibleTrigger.displayName = 'CollapsibleTrigger'

const CollapsibleContent = CollapsiblePrimitive.Panel

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
