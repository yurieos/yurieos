/**
 * Gemini Research Workflow - Simplified Architecture
 *
 * Standard Mode: Gemini 3 Flash with Google Search grounding + thinking
 * Deep Research Mode: Official Deep Research Agent via Interactions API
 *
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 * @see https://ai.google.dev/gemini-api/docs/thinking
 * @see https://ai.google.dev/gemini-api/docs/thought-signatures
 */

import { ThinkingLevel } from '@google/genai'

import { deduplicateSources, parseGroundingMetadata } from './citations'
import { GEMINI_3_FLASH, GEMINI_3_PRO, getGeminiClient } from './client'
import { executeDeepResearch } from './deep-research-agent'
import {
  getDeepResearchFormatInstructions,
  getFollowUpPrompt,
  getStandardSystemInstruction
} from './system-instructions'
import {
  ContentPart,
  ConversationTurn,
  GroundingSource,
  ResearchChunk,
  ResearchConfig,
  ThinkingConfig
} from './types'

/**
 * Map string thinking level to SDK enum
 * Per https://ai.google.dev/gemini-api/docs/thinking#thinking-levels
 */
function mapThinkingLevel(level?: string): ThinkingLevel {
  switch (level) {
    case 'minimal':
      return ThinkingLevel.MINIMAL
    case 'low':
      return ThinkingLevel.LOW
    case 'medium':
      return ThinkingLevel.MEDIUM
    case 'high':
      return ThinkingLevel.HIGH
    default:
      return ThinkingLevel.HIGH // Default per docs
  }
}

// ============================================
// Main Research Function
// ============================================

/**
 * Main research workflow - routes to appropriate mode
 *
 * @param query - The research query
 * @param config - Research configuration
 * @yields ResearchChunk - Streaming research results
 */
export async function* research(
  query: string,
  config: ResearchConfig = {}
): AsyncGenerator<ResearchChunk> {
  const { mode = 'standard' } = config

  if (mode === 'deep-research') {
    yield* deepResearch(query, config)
  } else {
    yield* standardResearch(query, config)
  }
}

// ============================================
// Standard Mode: Gemini 3 Flash + Google Search
// ============================================

/**
 * Standard research using Gemini 3 Flash or Pro with Google Search grounding
 *
 * Thinking levels per https://ai.google.dev/gemini-api/docs/thinking:
 * - Gemini 3 Flash: minimal, low, medium, high (default: high)
 * - Gemini 3 Pro: low, high (default: high)
 *
 * Thinking configuration is passed via config.thinkingConfig:
 * - thinkingLevel: Controls reasoning depth
 * - includeThoughts: Enables thought summaries for transparency
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * - Gemini 3 models return thought signatures for all types of parts
 * - Must pass all signatures back as received for multi-turn
 */
export async function* standardResearch(
  query: string,
  config: ResearchConfig
): AsyncGenerator<ResearchChunk> {
  const ai = getGeminiClient()

  // Determine model based on selection
  const isPro = config.model?.includes('pro')
  const modelId = isPro ? GEMINI_3_PRO : GEMINI_3_FLASH

  // Use thinkingConfig from config, with sensible defaults
  // Per https://ai.google.dev/gemini-api/docs/thinking#thinking-levels
  const thinkingConfig = config.thinkingConfig || {}
  const thinkingLevel = mapThinkingLevel(thinkingConfig.thinkingLevel)
  const includeThoughts = thinkingConfig.includeThoughts ?? true

  try {
    yield { type: 'phase', phase: 'searching' }

    // Build conversation context if available (preserves thought signatures)
    const contents = buildContents(query, config.conversationHistory)

    // Stream response with Google Search grounding and thinking
    // Per https://ai.google.dev/gemini-api/docs/thinking:
    // - thinkingLevel controls reasoning depth
    // - includeThoughts enables thought summaries
    const response = await ai.models.generateContentStream({
      model: modelId,
      contents,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: getStandardSystemInstruction(),
        thinkingConfig: {
          thinkingLevel,
          includeThoughts
        },
        // Temperature 0.4 for factual accuracy in research responses
        // Per https://ai.google.dev/gemini-api/docs/text-generation
        temperature: 0.4
      }
    })

    let allSources: GroundingSource[] = []
    let fullText = ''
    let lastCandidate: any = null
    // Collect all model response parts for thought signature preservation
    const collectedParts: ContentPart[] = []

    yield { type: 'phase', phase: 'synthesizing' }

    for await (const chunk of response) {
      lastCandidate = chunk.candidates?.[0]

      // Process each part - handle both text and thoughts
      for (const part of lastCandidate?.content?.parts || []) {
        // Collect parts with thought signatures for multi-turn preservation
        // Per https://ai.google.dev/gemini-api/docs/thought-signatures
        if (part.text || part.thoughtSignature) {
          collectedParts.push({
            text: part.text,
            thought: part.thought,
            thoughtSignature: part.thoughtSignature
          })
        }

        if (!part.text) continue

        // Check if this is a thought part
        if (part.thought) {
          // Emit thought for ChainOfThought display
          yield { type: 'thought', content: part.text }
        } else {
          // Regular text content
          fullText += part.text
          yield { type: 'content', content: part.text }
        }
      }
    }

    // Extract sources from grounding metadata after streaming completes
    if (lastCandidate) {
      const { sources, searchQueries } = parseGroundingMetadata(lastCandidate)
      allSources = deduplicateSources(sources)

      if (allSources.length > 0) {
        // Emit sources for frontend
        yield {
          type: 'sources',
          sources: allSources,
          metadata: {
            sourceCount: allSources.length,
            searchQueries
          }
        }

        // Also emit individual sources for annotations
        for (const source of allSources) {
          yield { type: 'source', source }
        }
      }
    }

    // Emit model parts with thought signatures for preservation in multi-turn
    // Only emit final consolidated parts (deduplicated)
    const finalParts = deduplicateModelParts(collectedParts)
    if (finalParts.length > 0) {
      yield { type: 'model-parts', modelParts: finalParts }
    }

    // Generate follow-up questions
    const followUps = await generateFollowUps(query, fullText)
    if (followUps.length > 0) {
      yield { type: 'followup', followUpQuestions: followUps }
    }

    yield {
      type: 'complete',
      metadata: { sourceCount: allSources.length }
    }
  } catch (error) {
    console.error('[Standard Research] Error:', error)
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Research failed'
    }
  }
}

// ============================================
// Deep Research Mode: Official Deep Research Agent
// ============================================

/**
 * Deep research using the official Gemini Deep Research Agent
 *
 * Uses the Interactions API for multi-step research:
 * Plan → Search → Read → Iterate → Output
 *
 * Thinking is handled internally by the Deep Research Agent:
 * - Uses thinking_summaries: 'auto' for real-time progress updates
 * - Agent uses maximum reasoning depth (equivalent to ThinkingLevel.HIGH)
 *
 * Research tasks typically take 5-20 minutes (max 60 minutes).
 *
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 * @see https://ai.google.dev/gemini-api/docs/thinking
 */
export async function* deepResearch(
  query: string,
  config: ResearchConfig
): AsyncGenerator<ResearchChunk> {
  // Use the official Deep Research Agent via Interactions API
  // The agent handles thinking internally with maximum reasoning depth
  yield* executeDeepResearch(query, {
    thinkingSummaries: true, // Enable thought summaries for progress updates
    formatInstructions: getDeepResearchFormatInstructions(),
    previousInteractionId: config.previousInteractionId
  })
}

// ============================================
// Helper Functions
// ============================================

/**
 * Build contents array for multi-turn conversations
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * - Gemini 3 models return thought signatures for all types of parts
 * - We must pass all signatures back as received to maintain reasoning context
 * - Don't concatenate parts with signatures together
 * - Don't merge one part with a signature with another part without a signature
 */
function buildContents(
  query: string,
  history?: ConversationTurn[]
): string | Array<{ role: string; parts: ContentPart[] }> {
  if (!history || history.length === 0) {
    return query
  }

  // Format as multi-turn conversation, preserving thought signatures
  const contents = history.map(msg => {
    // If parts are provided, use them directly to preserve thought signatures
    if (msg.parts && msg.parts.length > 0) {
      return {
        role: msg.role,
        parts: msg.parts
      }
    }
    // Fallback to simple text content (backwards compatibility)
    return {
      role: msg.role,
      parts: [{ text: msg.content || '' }]
    }
  })

  // Add current query
  contents.push({
    role: 'user',
    parts: [{ text: query }]
  })

  return contents
}

/**
 * Deduplicate model parts from streaming chunks
 * During streaming, we receive incremental parts that may overlap
 * This consolidates them into a final set of unique parts
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * - Don't concatenate parts with signatures together
 * - Don't merge one part with a signature with another part without a signature
 */
function deduplicateModelParts(parts: ContentPart[]): ContentPart[] {
  const seen = new Map<string, ContentPart>()

  for (const part of parts) {
    // Create a unique key for each part
    // Parts with thought signatures are unique and must be preserved as-is
    const key = part.thoughtSignature
      ? `sig:${part.thoughtSignature}`
      : `text:${part.text || ''}`

    // Keep the most complete version of each part
    const existing = seen.get(key)
    if (!existing || (part.thoughtSignature && !existing.thoughtSignature)) {
      seen.set(key, part)
    }
  }

  return Array.from(seen.values())
}

/**
 * Generate follow-up questions based on the query and response
 *
 * Uses structured output for guaranteed valid JSON response.
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 * @see https://ai.google.dev/gemini-api/docs/prompting-strategies
 */
export async function generateFollowUps(
  query: string,
  response: string
): Promise<string[]> {
  try {
    const ai = getGeminiClient()

    // Use centralized prompt from system-instructions module
    const prompt = getFollowUpPrompt(query, response.slice(0, 600))

    const result = await ai.models.generateContent({
      model: GEMINI_3_FLASH,
      contents: prompt,
      config: {
        // Per https://ai.google.dev/gemini-api/docs/thinking - use ThinkingLevel.MINIMAL
        // MINIMAL minimizes latency for simple tasks
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        // Structured output guarantees valid JSON
        // Per https://ai.google.dev/gemini-api/docs/structured-output
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3,
              description: 'Exactly 3 follow-up questions'
            }
          },
          required: ['questions']
        }
      }
    })

    const parsed = JSON.parse(result.text || '{}')
    if (Array.isArray(parsed.questions)) {
      return parsed.questions
        .slice(0, 3)
        .filter((q: unknown) => typeof q === 'string')
    }
  } catch (error) {
    console.error('[Follow-ups] Generation failed:', error)
  }

  return []
}
