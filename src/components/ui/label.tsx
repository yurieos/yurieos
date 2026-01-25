'use client'

import * as React from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: Label wrapper component - htmlFor passed by consumer
  <label ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = 'Label'

export { Label }
