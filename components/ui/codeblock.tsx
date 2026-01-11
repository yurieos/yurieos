// Referenced from Vercel's AI Chatbot and modified to fit the needs of this project
// https://github.com/vercel/ai-chatbot/blob/c2757f87f986b7f15fdf75c4c89cb2219745c53f/components/ui/codeblock.tsx

'use client'

import { FC, memo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { useTheme } from 'next-themes'

import { generateId } from 'ai'
import { Check, Copy, Download } from 'lucide-react'

import { cn } from '@/lib/utils'
import { programmingLanguages } from '@/lib/utils/programming-languages'
import { vintagePaperLight } from '@/lib/utils/syntax-themes'

import { useCopyToClipboard } from '@/hooks'

import { Button } from '@/components/ui/button'

interface Props {
  language: string
  value: string
}

const CodeBlock: FC<Props> = memo(({ language, value }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const syntaxTheme = isDark ? coldarkDark : vintagePaperLight

  const downloadAsFile = () => {
    if (typeof window === 'undefined') {
      return
    }
    const fileExtension = programmingLanguages[language] || '.file'
    const suggestedFileName = `file-${generateId()}${fileExtension}`
    const fileName = window.prompt('Enter file name', suggestedFileName)

    if (!fileName) {
      // User pressed cancel on prompt.
      return
    }

    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = fileName
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(value)
  }

  return (
    <div
      className={cn(
        'relative w-full max-w-full font-mono codeblock rounded-lg',
        isDark
          ? 'bg-card border border-border'
          : 'bg-[#f5f0e6] border border-[#d9d0c3]'
      )}
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      <div
        className={cn(
          'flex items-center justify-between w-full px-4 py-1 pr-1',
          isDark
            ? 'bg-muted text-muted-foreground'
            : 'bg-[#e8e0d4] text-[#6b5d4d]'
        )}
      >
        <span className="text-xs lowercase truncate">{language}</span>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            variant="ghost"
            className="focus-visible:ring-1 size-8"
            onClick={downloadAsFile}
            size="icon"
          >
            <Download className="size-4" />
            <span className="sr-only">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-xs focus-visible:ring-1 focus-visible:ring-offset-0 size-8"
            onClick={onCopy}
          >
            {isCopied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
      </div>
      <div
        className={cn('overflow-x-auto', isDark ? 'bg-card' : 'bg-[#f5f0e6]')}
      >
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          PreTag="div"
          showLineNumbers
          customStyle={{
            margin: 0,
            background: 'transparent',
            padding: '1rem 0.5rem',
            fontSize: '0.8rem'
          }}
          lineNumberStyle={{
            userSelect: 'none',
            minWidth: '2em',
            paddingRight: '0.5em',
            color: isDark ? '#6b5d4d' : '#b8a892'
          }}
          codeTagProps={{
            style: {
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)'
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'

export { CodeBlock }
