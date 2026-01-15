import { cookies } from 'next/headers'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createGeminiStreamResponse, isGeminiAvailable } from '@/lib/gemini'
import { validateChatRequest } from '@/lib/schema/chat'
import { parseModelFromCookie } from '@/lib/schema/model'

// Extended timeout for deep research
// Deep research tasks can take 5-60 minutes per Gemini docs
// @see https://ai.google.dev/gemini-api/docs/deep-research
// Set to maximum allowed by most hosting platforms
// - Vercel Pro: 300s, Vercel Enterprise: custom
// - Self-hosted: can be much higher (3600s = 1 hour)
export const maxDuration = 3600

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

    const {
      messages,
      id: chatId,
      mode,
      functions,
      functionCallingMode,
      allowedFunctionNames
    } = validation.data
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

    // Use Gemini research with streaming response
    // Pass selected model and thinkingConfig for Gemini 3 models
    // Per https://ai.google.dev/gemini-api/docs/thinking
    // Per https://ai.google.dev/gemini-api/docs/function-calling
    return createGeminiStreamResponse({
      messages,
      chatId,
      userId,
      mode,
      model: selectedModel.id,
      thinkingConfig: selectedModel.thinkingConfig,
      // Function calling configuration
      // Cast is safe as types are structurally compatible
      functions: functions as
        | import('@/lib/gemini').FunctionDeclaration[]
        | undefined,
      functionCallingMode: functionCallingMode as
        | import('@/lib/gemini').FunctionCallingMode
        | undefined,
      allowedFunctionNames
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
