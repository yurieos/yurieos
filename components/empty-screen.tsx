import Link from 'next/link'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

const exampleMessages = [
  {
    heading: 'How were the pyramids really built?',
    message: 'How were the pyramids really built?'
  },
  {
    heading: "Pompeii's final hours under Vesuvius",
    message: "Pompeii's final hours under Vesuvius"
  },
  {
    heading: 'Why did Rome actually fall?',
    message: 'Why did Rome actually fall?'
  },
  {
    heading: 'Who really killed Julius Caesar?',
    message: 'Who really killed Julius Caesar?'
  },
  {
    heading: 'Was the Trojan Horse real?',
    message: 'Was the Trojan Horse real?'
  },
  {
    heading: 'Who really wrote the Dead Sea Scrolls?',
    message: 'Who really wrote the Dead Sea Scrolls?'
  },
  {
    heading: 'What did mummies teach modern science?',
    message: 'What did mummies teach modern science?'
  }
]

export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <Search size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
        {/* Footer links for Google OAuth compliance */}
        <div className="mt-8 pt-4 border-t border-border/50">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
