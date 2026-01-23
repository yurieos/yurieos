'use client'

import type React from 'react'

import type { JSONValue } from 'ai'
import { CornerDownRight } from 'lucide-react'

import type { RelatedQuestionsAnnotation } from '@/lib/types'

import { CollapsibleMessage } from './collapsible-message'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export interface RelatedQuestionsProps {
  annotations: JSONValue[]
  onQuerySelect: (query: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  isLoading: boolean
}

export const RelatedQuestions: React.FC<RelatedQuestionsProps> = ({
  annotations,
  onQuerySelect,
  isOpen,
  onOpenChange,
  chatId,
  isLoading
}) => {
  if (!annotations) {
    return null
  }

  const lastRelatedQuestionsAnnotation = annotations[
    annotations.length - 1
  ] as unknown as RelatedQuestionsAnnotation

  const relatedQuestions = lastRelatedQuestionsAnnotation?.data
  const items = relatedQuestions?.items

  if ((!relatedQuestions || !items) && !isLoading) {
    return null
  }

  if ((!items || items.length === 0) && isLoading) {
    return (
      <CollapsibleMessage
        messageRole="assistant"
        isCollapsible={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        showIcon={false}
      >
        <Skeleton className="w-full h-6" />
      </CollapsibleMessage>
    )
  }

  if (!items || items.length === 0) {
    return null
  }

  return (
    <CollapsibleMessage
      messageRole="assistant"
      isCollapsible={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showIcon={false}
    >
      <section className="pt-0 pb-4">
        <div className="flex flex-col">
          {Array.isArray(items) ? (
            items
              .filter(item => item?.query !== '')
              .map((item, index) => (
                <div
                  className="flex items-start w-full min-w-0"
                  key={item?.query || `related-${index}`}
                >
                  <CornerDownRight className="size-4 mr-2 mt-1 flex-shrink-0 text-accent-foreground/50" />
                  <Button
                    variant="link"
                    className="flex-1 min-w-0 justify-start px-0 py-1 h-fit font-semibold text-accent-foreground/50 whitespace-normal text-left break-words"
                    type="submit"
                    name={'related_query'}
                    value={item?.query}
                    onClick={() => onQuerySelect(item?.query)}
                  >
                    {item?.query}
                  </Button>
                </div>
              ))
          ) : (
            <div>Not an array</div>
          )}
        </div>
      </section>
    </CollapsibleMessage>
  )
}
export default RelatedQuestions
