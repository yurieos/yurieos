import { cookies } from 'next/headers'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { getDefaultModel } from '@/lib/config/models'
import { createGeminiStreamResponse, isGeminiAvailable } from '@/lib/gemini'
import { validateChatRequest } from '@/lib/schema/chat'
import { Model, ThinkingConfig } from '@/lib/types/models'

// Extended timeout for deep research
export const maxDuration = 300

/**
 * Safely parses and validates the model from cookies
 * Falls back to centralized default model from config
 * @see https://ai.google.dev/gemini-api/docs/thinking
 */
function parseModelFromCookie(modelJson: string | undefined): Model {
  const defaultModel = getDefaultModel()

  if (!modelJson) {
    return defaultModel
  }

  try {
    const parsed = JSON.parse(modelJson)

    // Validate essential model properties
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.providerId !== 'string'
    ) {
      console.warn('Invalid model structure in cookie, using default')
      return defaultModel
    }

    // Parse thinkingConfig if present (Gemini 3 uses thinkingLevel)
    // Per https://ai.google.dev/gemini-api/docs/gemini-3
    let thinkingConfig: ThinkingConfig | undefined
    if (parsed.thinkingConfig && typeof parsed.thinkingConfig === 'object') {
      thinkingConfig = {
        thinkingLevel: parsed.thinkingConfig.thinkingLevel,
        includeThoughts: parsed.thinkingConfig.includeThoughts
      }
    }

    return {
      id: parsed.id,
      name: parsed.name || parsed.id,
      provider: parsed.provider || parsed.providerId,
      providerId: parsed.providerId,
      enabled: parsed.enabled !== false,
      toolCallType: parsed.toolCallType || 'native',
      toolCallModel: parsed.toolCallModel,
      thinkingConfig
    }
  } catch (e) {
    console.error('Failed to parse selected model from cookie:', e)
    return defaultModel
  }
}

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

    const { messages, id: chatId, mode } = validation.data
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
    return createGeminiStreamResponse({
      messages,
      chatId,
      userId,
      mode,
      model: selectedModel.id,
      thinkingConfig: selectedModel.thinkingConfig
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
