import { Model } from '@/lib/types/models'

/**
 * Available AI models configuration.
 * To add or modify models, update this array and rebuild the application.
 */
const MODELS: Model[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    providerId: 'google',
    enabled: true,
    toolCallType: 'native',
    thinkingConfig: { thinkingLevel: 'minimal', includeThoughts: true }
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
