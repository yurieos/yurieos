'use client'

import { useCallback, useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { useTheme } from 'next-themes'

import { createReactBlockSpec } from '@blocknote/react'
import { generateId } from 'ai'
import { Check, ChevronDown, Copy, Download } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  COMMON_LANGUAGES,
  programmingLanguages
} from '@/lib/utils/programming-languages'
import { vintagePaperLight } from '@/lib/utils/syntax-themes'

import { useCopyToClipboard } from '@/hooks'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// ============================================
// Code Block Render Component
// ============================================

interface InlineContent {
  type: 'text'
  text: string
  styles: Record<string, unknown>
}

interface CodeBlockRenderProps {
  block: {
    id: string
    props: {
      language: string
    }
    content: InlineContent[]
  }
  editor: {
    updateBlock: (
      block: { id: string },
      update: { props?: { language?: string }; content?: InlineContent[] }
    ) => void
    isEditable: boolean
  }
  contentRef: React.RefObject<HTMLDivElement>
}

function CodeBlockRender({ block, editor, contentRef }: CodeBlockRenderProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
  const [isEditing, setIsEditing] = useState(false)
  const { resolvedTheme } = useTheme()

  const language = block.props.language || 'plaintext'
  const isDark = resolvedTheme === 'dark'
  const syntaxTheme = isDark ? coldarkDark : vintagePaperLight

  // Extract code from inline content (BlockNote's default format)
  const code =
    block.content
      ?.map(item => (item.type === 'text' ? item.text : ''))
      .join('') || ''

  const updateLanguage = useCallback(
    (newLanguage: string) => {
      editor.updateBlock(block, {
        props: { language: newLanguage }
      })
    },
    [editor, block]
  )

  const updateCode = useCallback(
    (newCode: string) => {
      editor.updateBlock(block, {
        content: [{ type: 'text', text: newCode, styles: {} }]
      })
    },
    [editor, block]
  )

  const downloadAsFile = useCallback(() => {
    if (typeof window === 'undefined') return

    const fileExtension = programmingLanguages[language] || '.txt'
    const suggestedFileName = `code-${generateId()}${fileExtension}`
    const fileName = window.prompt('Enter file name', suggestedFileName)

    if (!fileName) return

    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = fileName
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [code, language])

  const onCopy = useCallback(() => {
    if (isCopied) return
    copyToClipboard(code)
  }, [isCopied, copyToClipboard, code])

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateCode(e.target.value)
    },
    [updateCode]
  )

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow Tab to insert tab character
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = code.slice(0, start) + '  ' + code.slice(end)
        updateCode(newValue)
        // Set cursor position after the inserted spaces
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        }, 0)
      }
      // Escape exits edit mode
      if (e.key === 'Escape') {
        setIsEditing(false)
      }
    },
    [code, updateCode]
  )

  const handleFocus = useCallback(() => {
    if (editor.isEditable) {
      setIsEditing(true)
    }
  }, [editor.isEditable])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
  }, [])

  // Hide the default contentRef since we're rendering our own content
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.display = 'none'
    }
  }, [contentRef])

  return (
    <div
      className={cn(
        'relative w-full max-w-full font-mono codeblock rounded-lg my-2 overflow-hidden',
        isDark
          ? 'bg-card border border-border'
          : 'bg-[#f5f0e6] border border-[#d9d0c3]'
      )}
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
      contentEditable={false}
    >
      {/* Header bar */}
      <div
        className={cn(
          'flex items-center justify-between w-full px-2 py-1 pr-1',
          isDark
            ? 'bg-muted/80 text-muted-foreground'
            : 'bg-[#e8e0d4] text-[#6b5d4d]'
        )}
      >
        {/* Language selector */}
        {editor.isEditable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs lowercase gap-1 hover:bg-background/50"
              >
                {language}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[300px] overflow-y-auto"
            >
              {COMMON_LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => updateLanguage(lang)}
                  className={cn(
                    'text-xs lowercase',
                    lang === language && 'bg-accent'
                  )}
                >
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs lowercase truncate">{language}</span>
        )}

        {/* Action buttons */}
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

      {/* Code content */}
      <div
        className={cn(
          'relative overflow-x-auto',
          isDark ? 'bg-card' : 'bg-[#f5f0e6]'
        )}
      >
        {editor.isEditable && isEditing ? (
          // Editable textarea when focused
          <textarea
            value={code}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            onBlur={handleBlur}
            autoFocus
            spellCheck={false}
            className={cn(
              'w-full min-h-[100px] p-4 bg-transparent resize-y',
              'font-mono text-[0.8rem] leading-relaxed',
              'border-none outline-none focus:ring-0',
              isDark
                ? 'text-foreground placeholder:text-muted-foreground/50'
                : 'text-[#4a4239] placeholder:text-[#6b5d4d]/50'
            )}
            placeholder="Enter your code here..."
            style={{
              fontFamily: 'var(--font-mono)',
              tabSize: 2
            }}
          />
        ) : (
          // Syntax highlighted view when not editing
          <div
            onClick={handleFocus}
            className={cn(
              'cursor-text',
              editor.isEditable && 'hover:bg-accent/5 transition-colors'
            )}
          >
            {code ? (
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
                {code}
              </SyntaxHighlighter>
            ) : (
              <div
                className={cn(
                  'p-4 text-sm italic',
                  isDark ? 'text-muted-foreground/50' : 'text-[#6b5d4d]/50'
                )}
              >
                {editor.isEditable ? 'Click to add code...' : 'No code content'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// BlockNote Custom Code Block Spec
// ============================================

export const CodeBlock = createReactBlockSpec(
  {
    type: 'codeBlock',
    propSchema: {
      language: {
        default: 'plaintext'
      }
    },
    // Use 'inline' content to be compatible with BlockNote's default codeBlock format
    content: 'inline'
  },
  {
    render: props => {
      return <CodeBlockRender {...(props as any)} />
    }
  }
)
