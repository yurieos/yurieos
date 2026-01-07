// Based on: https://github.com/vercel/ai/blob/main/examples/next-ai-rsc/components/llm-stocks/spinner.tsx

import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

interface CircleSpinnerProps extends React.SVGAttributes<SVGSVGElement> {}

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

/**
 * Circle spinner - commonly used in research/loading states
 */
export const CircleSpinner = ({ className, ...props }: CircleSpinnerProps) => (
  <svg
    className={cn('animate-spin', className)}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

export const LogoSpinner = () => (
  <div className="p-4 border border-background">
    <span className="text-base animate-spin inline-block">🧸</span>
  </div>
)
