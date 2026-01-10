/**
 * Gemini Core - Client and Citation Utilities
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */

import { GoogleGenAI } from '@google/genai'

import {
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

/** Gemini 3 Flash - Fast, efficient model for standard mode */
export const GEMINI_3_FLASH = 'gemini-3-flash-preview'

/** Gemini 3 Pro - Advanced model for deep research */
export const GEMINI_3_PRO = 'gemini-3-pro-preview'

/** Deep Research Agent - For comprehensive research tasks */
export const DEEP_RESEARCH_MODEL = 'deep-research-pro-preview-12-2025'

/** Gemini Image Flash (Nano Banana) - Fast, efficient image generation at 1024px
 * Optimized for high-volume, low-latency tasks
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const GEMINI_IMAGE_FLASH = 'gemini-2.5-flash-image'

/** Gemini Image Pro (Nano Banana Pro) - Professional asset production
 * Features: 4K resolution, text rendering, thinking mode, up to 14 reference images
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const GEMINI_IMAGE_PRO = 'gemini-3-pro-image-preview'

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
      url: chunk.web!.uri,
      domain: extractDomain(chunk.web!.uri)
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
