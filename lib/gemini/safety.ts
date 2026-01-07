/**
 * Gemini Safety Module
 * Simplified input validation and sanitization
 */

// ============================================
// Safety Result Type
// ============================================

export interface SafetyResult {
  blocked: boolean
  violations: string[]
  sanitizedInput: string
}

// ============================================
// Safety Patterns
// ============================================

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

// Simple PII patterns for detection (not comprehensive, just basic)
const PII_PATTERNS = [
  // SSN
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
  // Credit card numbers (basic)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  // Phone numbers (US format)
  /\b\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
]

// ============================================
// Main Safety Function
// ============================================

/**
 * Process input through safety checks
 * - Checks for prompt injection / jailbreak attempts
 * - Detects basic PII patterns
 * - Returns sanitized input
 */
export async function processInputSafely(input: string): Promise<SafetyResult> {
  const violations: string[] = []
  let blocked = false
  let sanitizedInput = input

  // Check for blocked patterns (prompt injection / jailbreak)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      violations.push('prompt_injection')
      blocked = true
      break
    }
  }

  // Check for PII (not blocked, just flagged)
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(input)) {
      violations.push('pii')
      // Redact the PII (replace with [REDACTED])
      sanitizedInput = sanitizedInput.replace(pattern, '[REDACTED]')
    }
  }

  return {
    blocked,
    violations,
    sanitizedInput
  }
}
