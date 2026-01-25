'use client'

import * as React from 'react'

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'

import { cn } from '@/lib/utils/index'

import { buttonVariants } from '@/components/ui/button'

const AlertDialog = AlertDialogPrimitive.Root

// Wrapper to support asChild prop for backward compatibility
interface AlertDialogTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger> {
  asChild?: boolean
}

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  AlertDialogTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <AlertDialogPrimitive.Trigger ref={ref} render={children} {...props} />
    )
  }
  return (
    <AlertDialogPrimitive.Trigger ref={ref} {...props}>
      {children}
    </AlertDialogPrimitive.Trigger>
  )
})
AlertDialogTrigger.displayName = 'AlertDialogTrigger'

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Backdrop
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-200',
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = 'AlertDialogOverlay'

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Popup>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Popup
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform] sm:rounded-3xl',
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = 'AlertDialogContent'

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
))
AlertDialogTitle.displayName = 'AlertDialogTitle'

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = 'AlertDialogDescription'

// AlertDialogAction uses Close with action styling
const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Close
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = 'AlertDialogAction'

// AlertDialogCancel uses Close with outline styling
const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Close
    ref={ref}
    className={cn(
      buttonVariants({ variant: 'outline' }),
      'mt-2 sm:mt-0',
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = 'AlertDialogCancel'

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger
}
