'use client'

import * as React from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Check, ChevronRight, Circle } from 'lucide-react'

import { cn } from '@/lib/utils/index'

const DropdownMenu = MenuPrimitive.Root

// Wrapper to support asChild prop for backward compatibility
interface DropdownMenuTriggerProps
  extends React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return <MenuPrimitive.Trigger ref={ref} render={children} {...props} />
  }
  return (
    <MenuPrimitive.Trigger ref={ref} {...props}>
      {children}
    </MenuPrimitive.Trigger>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuGroup = MenuPrimitive.Group

const DropdownMenuPortal = MenuPrimitive.Portal

const DropdownMenuSub = MenuPrimitive.SubmenuRoot

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubmenuTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-full px-2 py-1.5 text-sm outline-hidden focus:bg-accent data-[popup-open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </MenuPrimitive.SubmenuTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

interface DropdownMenuSubContentProps
  extends React.ComponentPropsWithoutRef<typeof MenuPrimitive.Popup> {
  sideOffset?: number
}

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuSubContentProps
>(({ className, sideOffset = 0, ...props }, ref) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner sideOffset={sideOffset} side="right">
      <MenuPrimitive.Popup
        ref={ref}
        className={cn(
          'z-50 min-w-32 overflow-hidden rounded-3xl border bg-popover p-1 text-popover-foreground shadow-lg data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform] duration-200 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
          className
        )}
        {...props}
      />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'

interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof MenuPrimitive.Popup> {
  sideOffset?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  // Radix compatibility - ignored in Base UI
  forceMount?: boolean
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    {
      className,
      sideOffset = 4,
      side = 'bottom',
      align = 'start',
      forceMount: _forceMount,
      ...props
    },
    ref
  ) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        sideOffset={sideOffset}
        side={side}
        align={align}
      >
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(
            'z-50 max-h-(--available-height) min-w-32 overflow-y-auto overflow-x-hidden rounded-3xl border bg-popover p-1 text-popover-foreground shadow-md data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform] duration-200 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> {
  inset?: boolean
  asChild?: boolean
}

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(({ className, inset, asChild, children, ...props }, ref) => {
  const itemClassName = cn(
    'relative flex cursor-default select-none items-center gap-2 rounded-full px-2 py-1.5 text-sm outline-hidden transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    inset && 'pl-8',
    className
  )

  if (asChild && React.isValidElement(children)) {
    return (
      <MenuPrimitive.Item
        ref={ref}
        className={itemClassName}
        render={children}
        {...props}
      />
    )
  }

  return (
    <MenuPrimitive.Item ref={ref} className={itemClassName} {...props}>
      {children}
    </MenuPrimitive.Item>
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-full py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenuPrimitive.CheckboxItemIndicator>
        <Check className="h-4 w-4" />
      </MenuPrimitive.CheckboxItemIndicator>
    </span>
    {children}
  </MenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-full py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenuPrimitive.RadioItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenuPrimitive.RadioItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

// Use a styled div instead of MenuPrimitive.GroupLabel since Base UI requires
// GroupLabel to be inside a Group context, but Radix allowed standalone usage
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
}
