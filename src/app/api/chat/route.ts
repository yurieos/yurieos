import { cookies } from 'next/headers'

import { createGeminiStreamResponse, isGeminiAvailable } from '@/lib/gemini'
import { getCurrentUserId } from '@/lib/get-current-user'
import { validateChatRequest } from '@/lib/schema/chat'
import { parseModelFromCookie } from '@/lib/schema/model'

// Maximum function timeout for Vercel
// Vercel limits: Hobby 300s, Pro 300s, Enterprise custom
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate request body
    const validation = validateChatRequest(body)
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { messages, id: chatId } = validation.data
    const userId = await getCurrentUserId()

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const selectedModel = parseModelFromCookie(modelJson)

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return new Response(
        JSON.stringify({
          error: 'Gemini API key is required',
          hint: 'Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment variables'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Use Gemini streaming response
    return createGeminiStreamResponse({
      messages,
      chatId,
      userId,
      model: selectedModel.id
    })
  } catch (error) {
    console.error('API route error:', error)
    return new Response(
      JSON.stringify({
        error: 'Error processing your request',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
