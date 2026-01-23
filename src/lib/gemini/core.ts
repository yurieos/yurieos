/**
 * Gemini Core - Client and Citation Utilities
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */

import { GoogleGenAI } from '@google/genai'

import type {
  GeminiCandidate,
  GroundingSource,
  GroundingSupport,
  GroundingSupportItem,
  UrlContextMetadata,
  UrlMetadata,
  WebGroundingChunk
} from './types'

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

/** Gemini 3 Flash - Fast, efficient model for Agentic AI */
export const GEMINI_3_FLASH = 'gemini-3-flash-preview'

/** Gemini 3 Pro - Advanced model with extended reasoning */
export const GEMINI_3_PRO = 'gemini-3-pro-preview'

// ============================================
// Citation Parsing
// ============================================

/**
 * Parse grounding metadata from Gemini response candidate
 * @param candidate - The response candidate from Gemini API
 * @returns Parsed sources, supports, and search queries
 */
export function parseGroundingMetadata(candidate: GeminiCandidate | null): {
  sources: GroundingSource[]
  supports: GroundingSupport[]
  searchQueries: string[]
} {
  const metadata = candidate?.groundingMetadata

  if (!metadata) {
    return { sources: [], supports: [], searchQueries: [] }
  }

  // Extract sources from groundingChunks
  const sources: GroundingSource[] = (metadata.groundingChunks || [])
    .filter((chunk: WebGroundingChunk) => chunk.web?.uri)
    .map((chunk: WebGroundingChunk, index: number) => ({
      id: `src-${index}`,
      title: chunk.web?.title || 'Untitled',
      url: chunk.web?.uri || '',
      domain: extractDomain(chunk.web?.uri || '')
    }))

  // Extract supports (text-to-source mappings)
  const supports: GroundingSupport[] = (metadata.groundingSupports || []).map(
    (support: GroundingSupportItem) => ({
      text: support.segment?.text || '',
      startIndex: support.segment?.startIndex || 0,
      endIndex: support.segment?.endIndex || 0,
      sourceIndices: support.groundingChunkIndices || []
    })
  )

  // Extract search queries used
  const searchQueries: string[] = metadata.webSearchQueries || []

  return { sources, supports, searchQueries }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

/**
 * Deduplicate sources by URL
 */
export function deduplicateSources(
  sources: GroundingSource[]
): GroundingSource[] {
  const seen = new Set<string>()
  return sources.filter(source => {
    if (seen.has(source.url)) return false
    seen.add(source.url)
    return true
  })
}

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

// ============================================
// URL Context - Utilities
// @see https://ai.google.dev/gemini-api/docs/url-context
// ============================================

/**
 * Maximum number of URLs per request
 * @see https://ai.google.dev/gemini-api/docs/url-context#limitations
 */
export const MAX_URLS_PER_REQUEST = 20

/**
 * Maximum content size per URL in MB
 * @see https://ai.google.dev/gemini-api/docs/url-context#limitations
 */
export const MAX_URL_CONTENT_SIZE_MB = 34

/**
 * Regex pattern to extract URLs from text
 * Matches URLs with http/https protocol
 */
const URL_PATTERN =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi

/**
 * Parse URL context metadata from Gemini response candidate
 * @param candidate - The response candidate from Gemini API
 * @returns Parsed URL context metadata or null if not present
 * @see https://ai.google.dev/gemini-api/docs/url-context#understanding_the_response
 */
export function parseUrlContextMetadata(
  candidate: GeminiCandidate | null
): UrlContextMetadata | null {
  const metadata = candidate?.urlContextMetadata

  if (!metadata || !metadata.urlMetadata) {
    return null
  }

  return metadata
}

/**
 * Extract URLs from a query string
 * Best practice: Provide direct URLs to the content you want the model to analyze
 * @param query - The user query text
 * @returns Array of extracted URLs
 * @see https://ai.google.dev/gemini-api/docs/url-context#best_practices
 */
export function extractUrlsFromQuery(query: string): string[] {
  const matches = query.match(URL_PATTERN)
  if (!matches) {
    return []
  }

  // Deduplicate and return unique URLs
  return [...new Set(matches)]
}

/**
 * Validate URL count against the limit
 * @param urls - Array of URLs to validate
 * @returns Validation result with any warning message
 * @see https://ai.google.dev/gemini-api/docs/url-context#limitations
 */
export function validateUrlCount(urls: string[]): {
  valid: boolean
  count: number
  warning?: string
} {
  const count = urls.length

  if (count > MAX_URLS_PER_REQUEST) {
    return {
      valid: false,
      count,
      warning: `URL limit exceeded: ${count} URLs provided, maximum is ${MAX_URLS_PER_REQUEST}. Only the first ${MAX_URLS_PER_REQUEST} URLs will be processed.`
    }
  }

  return { valid: true, count }
}

/**
 * Get summary of URL retrieval results
 * @param metadata - URL context metadata from response
 * @returns Summary object with counts and details
 */
export function getUrlRetrievalSummary(metadata: UrlContextMetadata | null): {
  total: number
  successful: number
  failed: number
  unsafe: number
  urls: Array<{ url: string; success: boolean; status: string }>
} {
  if (!metadata?.urlMetadata) {
    return { total: 0, successful: 0, failed: 0, unsafe: 0, urls: [] }
  }

  const urls = metadata.urlMetadata.map((m: UrlMetadata) => ({
    url: m.retrievedUrl,
    success: m.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS',
    status: m.urlRetrievalStatus
  }))

  return {
    total: urls.length,
    successful: urls.filter(u => u.success).length,
    failed: urls.filter(u => u.status === 'URL_RETRIEVAL_STATUS_ERROR').length,
    unsafe: urls.filter(u => u.status === 'URL_RETRIEVAL_STATUS_UNSAFE').length,
    urls
  }
}

// ============================================
// Enhanced URL Validation and Processing
// ============================================

/**
 * URL validation result
 */
export interface UrlValidationResult {
  /** Whether the URL is valid */
  valid: boolean
  /** The normalized URL (cleaned up) */
  normalizedUrl?: string
  /** Error message if invalid */
  error?: string
}

/**
 * Blocked URL patterns (domains that shouldn't be accessed)
 */
const BLOCKED_URL_PATTERNS = [
  /^localhost/i,
  /^127\.0\.0\.1/,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^0\.0\.0\.0/,
  /\.local$/i,
  /\.internal$/i
]

/**
 * Validate a single URL
 *
 * @param url - URL to validate
 * @returns Validation result
 *
 * @example
 * ```ts
 * const result = validateUrl('https://example.com')
 * if (result.valid) {
 *   console.log('Valid URL:', result.normalizedUrl)
 * }
 * ```
 */
export function validateUrl(url: string): UrlValidationResult {
  try {
    const parsed = new URL(url)

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are supported' }
    }

    // Check for blocked patterns (private networks, localhost)
    const host = parsed.hostname.toLowerCase()
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(host)) {
        return { valid: false, error: 'Private/local URLs are not supported' }
      }
    }

    // Normalize the URL (remove trailing slashes, lowercase hostname)
    const normalizedUrl = parsed.href.replace(/\/+$/, '')

    return { valid: true, normalizedUrl }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Process and validate a list of URLs
 *
 * Validates, deduplicates, and truncates URLs to the maximum allowed.
 *
 * @param urls - Array of URLs to process
 * @returns Processed URLs with validation results
 *
 * @example
 * ```ts
 * const result = processUrls(['https://example.com', 'invalid-url'])
 * console.log(`Valid: ${result.valid.length}, Invalid: ${result.invalid.length}`)
 * ```
 */
export function processUrls(urls: string[]): {
  /** Valid, deduplicated URLs ready to use */
  valid: string[]
  /** Invalid URLs with error messages */
  invalid: Array<{ url: string; error: string }>
  /** Whether any URLs were truncated due to limit */
  truncated: boolean
  /** Original count before processing */
  originalCount: number
} {
  const result = {
    valid: [] as string[],
    invalid: [] as Array<{ url: string; error: string }>,
    truncated: false,
    originalCount: urls.length
  }

  // Track seen URLs for deduplication (case-insensitive)
  const seen = new Set<string>()

  for (const url of urls) {
    // Skip if we've hit the limit
    if (result.valid.length >= MAX_URLS_PER_REQUEST) {
      result.truncated = true
      break
    }

    const validation = validateUrl(url)

    if (validation.valid && validation.normalizedUrl) {
      // Check for duplicates (case-insensitive)
      const lowerUrl = validation.normalizedUrl.toLowerCase()
      if (!seen.has(lowerUrl)) {
        seen.add(lowerUrl)
        result.valid.push(validation.normalizedUrl)
      }
    } else {
      result.invalid.push({ url, error: validation.error || 'Invalid URL' })
    }
  }

  return result
}

/**
 * Deduplicate URLs while preserving order
 *
 * @param urls - Array of URLs to deduplicate
 * @returns Deduplicated array of URLs
 */
export function deduplicateUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter(url => {
    const normalized = url.toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

/**
 * Check if a URL is likely accessible (basic heuristics)
 *
 * Note: This doesn't actually fetch the URL, just checks basic patterns.
 * For actual accessibility, the Gemini API will report retrieval status.
 *
 * @param url - URL to check
 * @returns Whether the URL appears accessible
 */
export function isUrlLikelyAccessible(url: string): boolean {
  const validation = validateUrl(url)
  if (!validation.valid) return false

  // Check for common patterns that suggest non-accessible content
  const lowerUrl = url.toLowerCase()

  // Login/auth pages
  if (/\/(login|signin|auth|oauth|sso|logout)\b/i.test(lowerUrl)) {
    return false
  }

  // Admin/internal pages
  if (/\/(admin|internal|private|dashboard)\b/i.test(lowerUrl)) {
    return false
  }

  // File types that might not be text content
  if (/\.(exe|dmg|zip|tar|gz|rar|7z|iso)\b/i.test(lowerUrl)) {
    return false
  }

  return true
}
