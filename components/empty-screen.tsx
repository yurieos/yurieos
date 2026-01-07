import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

const exampleMessages = [
  {
    heading: 'Why do octopuses edit their RNA?',
    message: 'Why do octopuses edit their RNA?'
  },
  {
    heading: 'The dancing plague of 1518',
    message: 'The dancing plague of 1518'
  },
  {
    heading: 'How fungi control ant brains',
    message: 'How fungi control ant brains'
  },
  {
    heading: 'Soviet experiments with dog heads',
    message: 'Soviet experiments with dog heads'
  },
  {
    heading: 'Why time moves differently underwater',
    message: 'Why time moves differently underwater'
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
