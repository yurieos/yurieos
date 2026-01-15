'use client'

import type { Options } from 'react-markdown'

import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { MemoizedReactMarkdown } from '@/components/ui/markdown'

import 'katex/dist/katex.min.css'

type LatexMarkdownProps = {
  content: string
  components?: Options['components']
}

export function LatexMarkdown({ content, components }: LatexMarkdownProps) {
  return (
    <MemoizedReactMarkdown
      rehypePlugins={[
        [rehypeExternalLinks, { target: '_blank' }],
        [rehypeKatex]
      ]}
      remarkPlugins={[remarkGfm, remarkMath]}
      components={components}
    >
      {content}
    </MemoizedReactMarkdown>
  )
}
