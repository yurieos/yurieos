// Based on: https://github.com/vercel/ai/blob/main/examples/next-ai-rsc/components/llm-stocks/spinner.tsx

import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Pulsing dot spinner - matches Progress UI positioning
 */
export const Spinner = ({ className, ...props }: SpinnerProps) => (
  <div
    className={cn('flex size-6 items-center justify-center', className)}
    {...props}
  >
    <div className="size-2.5 rounded-full bg-primary animate-bounce-dot" />
  </div>
)
