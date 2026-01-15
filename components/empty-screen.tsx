import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

const exampleMessages = [
  // Science
  {
    heading: 'How does ZIP protein affect memory?',
    message: 'How does ZIP protein affect memory?'
  },
  {
    heading: 'Why does hot water freeze faster?',
    message: 'Why does hot water freeze faster?'
  },
  {
    heading: 'How do parasites control host brains?',
    message: 'How do parasites control host brains?'
  },
  {
    heading: 'Why is anesthesia still a mystery?',
    message: 'Why is anesthesia still a mystery?'
  },
  // History
  {
    heading: 'What caused the 1518 dancing plague?',
    message: 'What caused the 1518 dancing plague?'
  },
  {
    heading: 'Why did Australia lose the Emu War?',
    message: 'Why did Australia lose the Emu War?'
  },
  {
    heading: 'How did radium girls change labor laws?',
    message: 'How did radium girls change labor laws?'
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
      </div>
    </div>
  )
}
