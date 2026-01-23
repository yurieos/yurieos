/**
 * Function Execution Engine
 * Handles function call extraction, execution, and response building
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

import { functionRegistry } from './registry'
import type { FunctionCall, FunctionResponse } from './types'
import { validateFunctionArgs } from './validation'

/**
 * Content part from Gemini response (minimal type for extraction)
 */
interface ContentPart {
  functionCall?: FunctionCall
  functionResponse?: FunctionResponse
  text?: string
  thought?: boolean
  thoughtSignature?: string
}

/**
 * Extract function calls from model response candidate
 * Per docs: function calls may not be in first part
 * @see https://ai.google.dev/gemini-api/docs/function-calling#step-3
 */
export function extractFunctionCalls(
  candidate: { content?: { parts?: ContentPart[] } } | null
): FunctionCall[] {
  if (!candidate?.content?.parts) return []

  return candidate.content.parts
    .filter(
      (part): part is ContentPart & { functionCall: FunctionCall } =>
        !!part.functionCall
    )
    .map(part => part.functionCall)
}

/**
 * Execute function calls in parallel (for independent calls)
 * Per https://ai.google.dev/gemini-api/docs/function-calling#parallel_function_calling
 */
export async function executeFunctionCalls(
  calls: FunctionCall[]
): Promise<FunctionResponse[]> {
  // Validate each call before execution
  const validatedCalls = calls.map(call => {
    const fn = functionRegistry.get(call.name)
    if (!fn) {
      return { call, valid: false, error: `Unknown function: ${call.name}` }
    }

    if (fn.requiresValidation) {
      const validation = validateFunctionArgs(
        call.args,
        fn.declaration.parameters
      )
      if (!validation.valid) {
        return { call, valid: false, error: validation.error }
      }
    }

    return { call, valid: true }
  })

  // Execute all valid calls in parallel
  const results = await Promise.all(
    validatedCalls.map(async ({ call, valid, error }) => {
      if (!valid) {
        return { name: call.name, response: { error } }
      }
      return functionRegistry.execute(call.name, call.args)
    })
  )

  return results
}

/**
 * Build function response parts for next API call
 * Per docs: Include responses in same order as requests
 * @see https://ai.google.dev/gemini-api/docs/function-calling#step-4
 */
export function buildFunctionResponseParts(
  responses: FunctionResponse[]
): ContentPart[] {
  return responses.map(r => ({
    functionResponse: r
  }))
}

/**
 * Check finish reason for errors
 * Per best practice: Always check finishReason
 * @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
 */
export function checkFinishReason(
  candidate: {
    finishReason?: string
  } | null
): { ok: boolean; error?: string } {
  if (!candidate) {
    return { ok: false, error: 'No response candidate' }
  }

  switch (candidate.finishReason) {
    case 'STOP':
    case 'MAX_TOKENS':
      return { ok: true }
    case 'SAFETY':
      return { ok: false, error: 'Content blocked by safety filters' }
    case 'RECITATION':
      return { ok: false, error: 'Response blocked due to recitation' }
    case 'OTHER':
      return { ok: false, error: 'Response generation stopped unexpectedly' }
    default:
      return { ok: true } // Unknown or undefined is ok during streaming
  }
}

/**
 * Check if response contains function calls
 */
export function hasFunctionCalls(
  candidate: {
    content?: { parts?: ContentPart[] }
  } | null
): boolean {
  return extractFunctionCalls(candidate).length > 0
}
