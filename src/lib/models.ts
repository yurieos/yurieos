import type { Model } from '@/lib/types'

/**
 * Default model ID - used when no model is selected
 */
export const DEFAULT_MODEL_ID = 'gemini-3-flash-preview'

/**
 * Available AI models configuration.
 * To add or modify models, update this array and rebuild the application.
 *
 * @see https://ai.google.dev/gemini-api/docs/thinking for thinking levels
 */
const MODELS: Model[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    providerId: 'google',
    enabled: true,
    toolCallType: 'native',
    thinkingConfig: { thinkingLevel: 'minimal', includeThoughts: false }
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    providerId: 'google',
    enabled: true,
    toolCallType: 'native',
    thinkingConfig: { thinkingLevel: 'high', includeThoughts: true }
  }
]

/**
 * Returns the list of available models.
 * Models are defined in this file for security (not publicly exposed)
 * and simplicity (no runtime file loading).
 */
export function getModels(): Model[] {
  return MODELS.filter(model => model.enabled)
}

/**
 * Returns the default model configuration.
 * This is the fallback when no model is selected via cookie.
 */
export function getDefaultModel(): Model {
  const models = getModels()
  return (
    models.find(m => m.id === DEFAULT_MODEL_ID) ||
    models[0] || {
      id: DEFAULT_MODEL_ID,
      name: 'Gemini 3 Flash',
      provider: 'Google',
      providerId: 'google',
      enabled: true,
      toolCallType: 'native',
      thinkingConfig: { thinkingLevel: 'medium', includeThoughts: true }
    }
  )
}
