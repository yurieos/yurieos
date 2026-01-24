import { z } from 'zod'

import { getDefaultModel } from '@/lib/models'
import type { Model } from '@/lib/types'

/**
 * Schema for model cookie structure
 * Validates the model configuration stored in cookies
 */
const ModelCookieSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  provider: z.string().optional(),
  providerId: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  toolCallType: z.enum(['native', 'manual']).optional().default('native'),
  toolCallModel: z.string().optional()
})

/**
 * Safely parses and validates the model from cookies
 * Falls back to centralized default model from config
 *
 * @param modelJson - JSON string from cookie
 * @returns Validated Model object
 */
export function parseModelFromCookie(modelJson: string | undefined): Model {
  const defaultModel = getDefaultModel()

  if (!modelJson) {
    return defaultModel
  }

  try {
    const parsed = JSON.parse(modelJson)
    const result = ModelCookieSchema.safeParse(parsed)

    if (!result.success) {
      console.warn(
        '[Model Cookie] Invalid structure, using default:',
        result.error.issues.map(i => i.message).join(', ')
      )
      return defaultModel
    }

    const data = result.data

    return {
      id: data.id,
      name: data.name || data.id,
      provider: data.provider || data.providerId,
      providerId: data.providerId,
      enabled: data.enabled,
      toolCallType: data.toolCallType,
      toolCallModel: data.toolCallModel
    }
  } catch (e) {
    console.error('[Model Cookie] Failed to parse:', e)
    return defaultModel
  }
}
