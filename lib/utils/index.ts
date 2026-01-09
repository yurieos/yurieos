import {
  generateId,
  JSONValue,
  ModelMessage,
  ToolModelMessage,
  UIMessage
} from 'ai'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { type Model } from '@/lib/types'

import { ExtendedCoreMessage } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createModelId(model: Model): string {
  return `${model.providerId}:${model.id}`
}

// ============================================
// AI SDK Compatibility Types
// ============================================

/** Tool part in UI message (v6 format) */
interface ToolUIPart {
  type: string
  toolCallId: string
  state?: string
  input?: unknown
  output?: unknown
}

/** Tool result from ToolModelMessage content */
interface ToolResultContent {
  type?: string
  toolCallId: string
  toolName?: string
  result?: unknown
  output?: unknown
}

/** Reasoning data structure */
interface ReasoningData {
  reasoningText?: string
  time?: number
}

/** Tool call content part */
interface ToolCallContent {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args?: unknown
  input?: unknown
}

/** Message with optional metadata - uses intersection type for compatibility */
type MessageWithMetadata = ModelMessage & {
  id?: string
  metadata?: {
    annotations?: JSONValue[]
  }
}

function addToolMessageToChat({
  toolMessage,
  messages
}: {
  toolMessage: ToolModelMessage
  messages: Array<UIMessage>
}): Array<UIMessage> {
  return messages.map(message => {
    // In v6, tool invocations are in message.parts as ToolUIPart
    if (message.role === 'assistant' && message.parts) {
      return {
        ...message,
        parts: message.parts.map(part => {
          if ((part.type as string).startsWith('tool-')) {
            const toolPart = part as unknown as ToolUIPart
            // Find matching tool result in the tool message content
            // In v6, ToolModelMessage content has { type: 'tool-result', toolCallId, toolName, output }
            // In v4 it was 'result' - support both for compatibility
            const toolResult = toolMessage.content.find(tool => {
              const toolWithId = tool as { toolCallId?: string }
              return (
                'toolCallId' in tool &&
                toolWithId.toolCallId === toolPart.toolCallId
              )
            }) as ToolResultContent | undefined

            if (toolResult) {
              // v6 uses 'output', v4 uses 'result' - support both
              const resultValue = toolResult.result || toolResult.output
              if (resultValue) {
                // v6 output is { type: 'json', value: {...} }, extract the value
                const outputWithValue = resultValue as { value?: unknown }
                const actualOutput = outputWithValue?.value ?? resultValue
                // Return updated tool part with output, preserving the type as tool-{name}
                return {
                  ...toolPart,
                  type: toolPart.type as `tool-${string}`,
                  state: 'output-available' as const,
                  output: actualOutput
                } as UIMessage['parts'][number]
              }
            }
          }
          return part
        })
      }
    }
    return message
  })
}

export function convertToUIMessages(
  messages: Array<ExtendedCoreMessage>
): Array<UIMessage> {
  const pendingAnnotations: JSONValue[] = []
  let pendingReasoning: string | undefined = undefined

  return messages.reduce((chatMessages: Array<UIMessage>, message) => {
    // Handle tool messages
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as ToolModelMessage,
        messages: chatMessages
      })
    }

    // Data messages are used to capture annotations, including reasoning.
    if (message.role === 'data') {
      if (
        message.content !== null &&
        message.content !== undefined &&
        typeof message.content !== 'string'
      ) {
        const content = message.content as JSONValue
        if (
          content &&
          typeof content === 'object' &&
          'type' in content &&
          'data' in content
        ) {
          if (content.type === 'reasoning') {
            // If content.data is an object, capture its reasoning text;
            // otherwise treat it as a simple string.
            if (typeof content.data === 'object' && content.data !== null) {
              const reasoningData = content.data as ReasoningData
              pendingReasoning = reasoningData.reasoningText
            } else {
              pendingReasoning = content.data as string
            }
          } else {
            pendingAnnotations.push(content)
          }
        }
      }
      return chatMessages
    }

    // Build the parts array for v6 UIMessage
    const parts: UIMessage['parts'] = []

    if (message.content) {
      if (typeof message.content === 'string') {
        parts.push({ type: 'text', text: message.content })
      } else if (Array.isArray(message.content)) {
        for (const content of message.content) {
          if (content && typeof content === 'object' && 'type' in content) {
            if (content.type === 'text' && 'text' in content) {
              parts.push({ type: 'text', text: String(content.text || '') })
            } else if (content.type === 'tool-call') {
              // AI SDK v6 uses 'input' instead of 'args', support both for compatibility
              if (
                'toolCallId' in content &&
                'toolName' in content &&
                ('args' in content || 'input' in content)
              ) {
                // In v6, tool calls are represented as tool-invocation parts
                const toolCallContent = content as ToolCallContent
                const toolInput = toolCallContent.args || toolCallContent.input
                parts.push({
                  type: `tool-${toolCallContent.toolName}`,
                  toolCallId: toolCallContent.toolCallId,
                  state: 'call',
                  input: toolInput
                } as unknown as UIMessage['parts'][number])
              }
            }
          }
        }
      }
    }

    // Add reasoning part if pending
    if (message.role === 'assistant' && pendingReasoning !== undefined) {
      parts.unshift({
        type: 'reasoning',
        text: pendingReasoning
      } as unknown as UIMessage['parts'][number])
    }

    // Create the new message in v6 format
    // IMPORTANT: Create a copy of pendingAnnotations to avoid reference issues
    // Also preserve any existing metadata from the saved message
    const messageWithMeta = message as MessageWithMetadata
    const existingMetadata = messageWithMeta.metadata
    const existingAnnotations = existingMetadata?.annotations || []

    // Merge pending annotations with existing saved annotations
    const allAnnotations = [...pendingAnnotations, ...existingAnnotations]

    const newMessage: UIMessage = {
      id: messageWithMeta.id || generateId(),
      role: message.role as 'user' | 'assistant' | 'system',
      parts,
      metadata:
        allAnnotations.length > 0
          ? { annotations: [...allAnnotations] }
          : existingMetadata || undefined
    } as UIMessage

    chatMessages.push(newMessage)

    // Clear pending state after processing an assistant message.
    if (message.role === 'assistant') {
      pendingAnnotations.length = 0
      pendingReasoning = undefined
    }

    return chatMessages
  }, [])
}
