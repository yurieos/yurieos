'use client'

import { memo, useMemo } from 'react'

import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { cn } from '@/lib/utils'

import { CodeBlock } from './ui/codeblock'
import { MemoizedReactMarkdown } from './ui/markdown'
import { Citing } from './custom-link'

import 'katex/dist/katex.min.css'

// Strip <think>...</think> tags from LLM output (common in reasoning models)
const stripThinkTags = (content: string) => {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
}

// Shared prose styling for markdown content
const proseClassName =
  'prose-sm prose-stone dark:prose-invert prose-a:text-primary/70 w-full max-w-full overflow-hidden [&>*]:max-w-full [&_p]:break-words [&_li]:break-words [&_ol]:pl-4 [&_ul]:pl-4'

export const BotMessage = memo(function BotMessage({
  message,
  className
}: {
  message: string
  className?: string
}) {
  // Strip think tags from message
  const cleanedMessage = useMemo(() => {
    return stripThinkTags(message || '')
  }, [message])

  // Check if the content contains LaTeX patterns
  const containsLaTeX = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/.test(
    cleanedMessage
  )

  // Modify the content to render LaTeX equations if LaTeX patterns are found
  const processedData = useMemo(
    () => (containsLaTeX ? preprocessLaTeX(cleanedMessage) : cleanedMessage),
    [cleanedMessage, containsLaTeX]
  )

  if (containsLaTeX) {
    return (
      <div className={cn(proseClassName, className)}>
        <MemoizedReactMarkdown
          rehypePlugins={[
            [rehypeExternalLinks, { target: '_blank' }],
            [rehypeKatex]
          ]}
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            a: Citing
          }}
        >
          {processedData}
        </MemoizedReactMarkdown>
      </div>
    )
  }

  return (
    <div className={cn(proseClassName, className)}>
      <MemoizedReactMarkdown
        rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }]]}
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            // Handle cursor animation for streaming responses
            const childArray = Array.isArray(children) ? children : [children]
            if (childArray.length > 0) {
              if (childArray[0] === '▍') {
                return (
                  <span className="mt-1 cursor-default animate-pulse">▍</span>
                )
              }
              if (typeof childArray[0] === 'string') {
                childArray[0] = childArray[0].replace('`▍`', '▍')
              }
            }

            const match = /language-(\w+)/.exec(className || '')
            const codeString = String(children)

            // Detect inline code: no language class AND no newlines in content
            const isInline = !match && !codeString.includes('\n')

            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock
                key={`codeblock-${codeString.slice(0, 50)}`}
                language={(match && match[1]) || ''}
                value={codeString.replace(/\n$/, '')}
              />
            )
          },
          a: Citing
        }}
      >
        {cleanedMessage}
      </MemoizedReactMarkdown>
    </div>
  )
})

// Preprocess LaTeX equations to be rendered by KaTeX
const preprocessLaTeX = (content: string) => {
  const blockProcessedContent = content.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, equation) => `$$${equation}$$`
  )
  const inlineProcessedContent = blockProcessedContent.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_, equation) => `$${equation}$`
  )
  return inlineProcessedContent
}
