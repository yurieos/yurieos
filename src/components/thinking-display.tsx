'use client'

import { useMemo } from 'react'

import type { UIMessage } from 'ai'

import type { ThoughtStepAnnotation } from '@/lib/types'
import { cn } from '@/lib/utils'

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger
} from '@/components/chain-of-thought'

interface ThinkingDisplayProps {
  message?: UIMessage
  className?: string
}

/**
 * ThinkingDisplay - Shows Gemini's thought process using ChainOfThought
 * Per https://ai.google.dev/gemini-api/docs/thinking
 * Displays thought summaries as collapsible steps
 */
export function ThinkingDisplay({ message, className }: ThinkingDisplayProps) {
  // Extract thought steps from message annotations
  const messageMetadata = message?.metadata as
    | { annotations?: Array<{ type: string; data: unknown }> }
    | undefined
  const thoughtSteps = useMemo(() => {
    if (!messageMetadata?.annotations) return []

    return messageMetadata.annotations
      .filter((a): a is ThoughtStepAnnotation => a.type === 'thought-step')
      .map(a => a.data)
  }, [messageMetadata])

  // Only render if there are thought steps to show
  if (thoughtSteps.length === 0) {
    return null
  }

  return (
    <div className={cn('w-full max-w-3xl', className)}>
      <ChainOfThought>
        {/* Show existing thought steps */}
        {thoughtSteps.map(step => (
          <ChainOfThoughtStep key={step.id}>
            <ChainOfThoughtTrigger>{step.summary}</ChainOfThoughtTrigger>
            {step.details && step.details.length > 0 && (
              <ChainOfThoughtContent>
                {step.details.map((detail, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Details are static content without stable IDs, index is appropriate
                  <ChainOfThoughtItem key={i}>{detail}</ChainOfThoughtItem>
                ))}
              </ChainOfThoughtContent>
            )}
          </ChainOfThoughtStep>
        ))}
      </ChainOfThought>
    </div>
  )
}
