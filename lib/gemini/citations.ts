/**
 * Gemini Grounding Citations - Parse and format citation metadata
 */

import { GroundingSource, GroundingSupport } from './types'

// ============================================
// Parsing Helpers
// ============================================

/**
 * Parse grounding metadata from Gemini response
 */
export function parseGroundingMetadata(candidate: any): {
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
    .filter((chunk: any) => chunk.web?.uri)
    .map((chunk: any, index: number) => ({
      id: `src-${index}`,
      title: chunk.web.title || 'Untitled',
      url: chunk.web.uri,
      domain: extractDomain(chunk.web.uri)
    }))

  // Extract supports (text-to-source mappings)
  const supports: GroundingSupport[] = (metadata.groundingSupports || []).map(
    (support: any) => ({
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

// ============================================
// Helper Functions
// ============================================

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
