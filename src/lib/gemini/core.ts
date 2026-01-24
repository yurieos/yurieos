/**
 * Gemini Core - Client and Safety Utilities
 * @see https://ai.google.dev/gemini-api/docs/text-generation
 */

import { GoogleGenAI } from '@google/genai'

// ============================================
// Client - Singleton Instance
// ============================================

let _client: GoogleGenAI | null = null

/**
 * Get the singleton GoogleGenAI client
 * Uses GEMINI_API_KEY or GOOGLE_API_KEY from environment
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required'
      )
    }
    _client = new GoogleGenAI({ apiKey })
  }
  return _client
}

/**
 * Check if Gemini client can be created
 */
export function isGeminiAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
}

// ============================================
// Model Constants
// ============================================

/** Gemini 3 Flash - Fast, efficient model */
export const GEMINI_3_FLASH = 'gemini-3-flash-preview'

/** Gemini 3 Pro - Advanced model with extended reasoning */
export const GEMINI_3_PRO = 'gemini-3-pro-preview'

// ============================================
// Safety - Input Validation
// ============================================

export interface SafetyResult {
  blocked: boolean
  violations: string[]
  sanitizedInput: string
}

const BLOCKED_PATTERNS = [
  // Prompt injection attempts
  /ignore\s+(previous|all|above)\s+instructions?/i,
  /disregard\s+(your|all|previous)\s+(instructions?|rules?|programming)/i,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/i,
  /pretend\s+(you('re)?|to\s+be)\s+(a\s+)?(different|evil|unrestricted)/i,
  /system\s*:\s*(you\s+are|ignore|override)/i,
  // Jailbreak patterns
  /\[system\]/i,
  /\[assistant\]/i,
  /do\s+anything\s+now/i,
  /bypass\s+(all\s+)?(restrictions?|filters?|safety)/i
]

const PII_PATTERNS = [
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
  /\b\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ // US phone
]

/**
 * Process input through safety checks
 */
export async function processInputSafely(input: string): Promise<SafetyResult> {
  const violations: string[] = []
  let blocked = false
  let sanitizedInput = input

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      violations.push('prompt_injection')
      blocked = true
      break
    }
  }

  for (const pattern of PII_PATTERNS) {
    if (pattern.test(input)) {
      violations.push('pii')
      sanitizedInput = sanitizedInput.replace(pattern, '[REDACTED]')
    }
  }

  return { blocked, violations, sanitizedInput }
}
