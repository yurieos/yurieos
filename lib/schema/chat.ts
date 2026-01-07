import { UIMessage } from 'ai'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(z.any()),
  mode: z.enum(['standard', 'deep-research']).default('standard')
})

export interface ChatRequest {
  id: string
  messages: UIMessage[]
  mode: 'standard' | 'deep-research'
}

export function validateChatRequest(
  body: unknown
): { success: true; data: ChatRequest } | { success: false; error: string } {
  const result = ChatRequestSchema.safeParse(body)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map(e => e.message).join(', ')
    }
  }

  return { success: true, data: result.data as ChatRequest }
}
