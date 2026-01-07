import { AnchorHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CitingProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode
}

export function Citing({ href, children, className, ...props }: CitingProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'hover:underline inline-flex items-center gap-1.5',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}
