/**
 * Gemini Agentic AI Workflow
 *
 * Two modes of operation:
 * - Standard Mode (Agentic): Gemini 3 Flash with tools (Google Search, URL Context, Code Execution, Function Calling)
 * - Deep Research Mode: Official Deep Research Agent via Interactions API
 *
 * Agentic capabilities:
 * - Google Search grounding for real-time web information
 * - URL Context for analyzing content from specific URLs
 * - Code Execution for calculations and data processing
 * - Function Calling for custom tools and external APIs
 * - Thinking with configurable reasoning depth
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search
 * @see https://ai.google.dev/gemini-api/docs/url-context
 * @see https://ai.google.dev/gemini-api/docs/code-execution
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 * @see https://ai.google.dev/gemini-api/docs/thinking
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

import {
  FunctionCallingConfigMode,
  FunctionDeclaration as SDKFunctionDeclaration,
  ThinkingLevel,
  Type
} from '@google/genai'

import {
  AudioPart,
  DocumentPart,
  ImagePart,
  ThinkingConfig,
  VideoPart
} from '@/lib/types'
import { logger } from '@/lib/utils/logger'

import { FunctionDeclaration, PropertySchema } from './function-calling/types'
import {
  deduplicateSources,
  GEMINI_3_FLASH,
  GEMINI_3_PRO,
  getGeminiClient,
  parseGroundingMetadata,
  parseUrlContextMetadata
} from './core'
import { executeDeepResearch } from './deep-research-agent'
import {
  checkFinishReason,
  executeFunctionCalls,
  extractFunctionCalls,
  functionRegistry
} from './function-calling'
import { withGeminiRetry } from './retry'
import {
  getDeepResearchFormatInstructions,
  getFollowUpPrompt,
  getStandardSystemInstruction
} from './system-instructions'
import {
  ContentPart,
  ConversationTurn,
  GeminiCandidate,
  GroundingSource,
  ResearchChunk,
  ResearchConfig
} from './types'

/**
 * SDK property schema type for converted properties
 */
interface SDKPropertySchema {
  type: Type
  description: string
  enum?: string[]
  items?: SDKPropertySchema
  properties?: Record<string, SDKPropertySchema>
  required?: string[]
}

/**
 * Convert our FunctionDeclaration to SDK FunctionDeclaration format
 * Maps string types to SDK Type enum
 * Handles nested types including arrays with items
 */
function toSDKFunctionDeclaration(
  fn: FunctionDeclaration
): SDKFunctionDeclaration {
  const typeMap: Record<string, Type> = {
    string: Type.STRING,
    integer: Type.INTEGER,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    object: Type.OBJECT
  }

  const convertPropertySchema = (prop: PropertySchema): SDKPropertySchema => {
    const result: SDKPropertySchema = {
      type: typeMap[prop.type] || Type.STRING,
      description: prop.description
    }

    // Add enum if present
    if (prop.enum) {
      result.enum = prop.enum
    }

    // Handle array items - required for array types
    if (prop.type === 'array' && prop.items) {
      result.items = convertPropertySchema(prop.items)
    }

    // Handle nested object properties
    if (prop.type === 'object' && prop.properties) {
      const nestedProperties: Record<string, SDKPropertySchema> = {}
      for (const [key, nestedProp] of Object.entries(prop.properties)) {
        nestedProperties[key] = convertPropertySchema(nestedProp)
      }
      result.properties = nestedProperties
      if (prop.required) {
        result.required = prop.required
      }
    }

    return result
  }

  const properties: Record<string, SDKPropertySchema> = {}
  for (const [key, prop] of Object.entries(fn.parameters.properties)) {
    properties[key] = convertPropertySchema(prop)
  }

  return {
    name: fn.name,
    description: fn.description,
    parameters: {
      type: Type.OBJECT,
      properties,
      required: fn.parameters.required
    }
  }
}

/**
 * Convert our FunctionCallingMode to SDK FunctionCallingConfigMode
 */
function toSDKFunctionCallingMode(
  mode: string
): FunctionCallingConfigMode | undefined {
  const modeMap: Record<string, FunctionCallingConfigMode> = {
    AUTO: FunctionCallingConfigMode.AUTO,
    ANY: FunctionCallingConfigMode.ANY,
    NONE: FunctionCallingConfigMode.NONE,
    VALIDATED: FunctionCallingConfigMode.VALIDATED
  }
  return modeMap[mode]
}

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
// Main Process Function (Router)
// ============================================

/**
 * Main workflow - routes to appropriate mode
 *
 * @param query - The user query
 * @param config - Configuration options
 * @yields ResearchChunk - Streaming results
 */
export async function* process(
  query: string,
  config: ResearchConfig = {}
): AsyncGenerator<ResearchChunk> {
  const { mode = 'standard' } = config

  if (mode === 'deep-research') {
    yield* deepResearch(query, config)
  } else {
    yield* agenticChat(query, config)
  }
}

// ============================================
// Standard Mode: Agentic AI with Tools
// ============================================

/**
 * Agentic chat using Gemini 3 Flash or Pro with built-in tools
 *
 * Tools enabled:
 * - Google Search grounding: Real-time web search for current information
 * - URL Context: Analyze content from specific URLs provided in the message
 * - Code Execution: Python code for calculations and data processing
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
 *
 * Per https://ai.google.dev/gemini-api/docs/url-context:
 * - URL context can be combined with Google Search
 * - Max 20 URLs per request, 34MB max per URL content
 * - Cannot be combined with function calling (native tools only)
 */
export async function* agenticChat(
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
    // Includes multimodal attachments:
    // - Images per https://ai.google.dev/gemini-api/docs/image-understanding
    // - Videos per https://ai.google.dev/gemini-api/docs/video-understanding
    // - Documents per https://ai.google.dev/gemini-api/docs/document-processing
    // - Audio per https://ai.google.dev/gemini-api/docs/audio
    const contents = buildContents(
      query,
      config.conversationHistory,
      config.images,
      config.videos,
      config.documents,
      config.audios
    )

    // Build tools array
    // Per https://ai.google.dev/gemini-api/docs/google-search
    // Per https://ai.google.dev/gemini-api/docs/code-execution
    // Per https://ai.google.dev/gemini-api/docs/function-calling
    //
    // IMPORTANT: Multi-tool use (combining native tools with function calling)
    // is a Live API only feature. For standard API, we must choose one or the other.
    // See: https://ai.google.dev/gemini-api/docs/function-calling#multi-tool-use
    //
    // Note: Code execution does NOT support video, PDF, or audio MIME types
    // See: https://ai.google.dev/gemini-api/docs/code-execution#io-details
    const hasVideos = config.videos && config.videos.length > 0
    const hasDocuments = config.documents && config.documents.length > 0
    const hasAudios = config.audios && config.audios.length > 0

    // Check if function calling is requested
    const hasFunctionDeclarations =
      (config.functions && config.functions.length > 0) ||
      (config.allowedFunctionNames && config.allowedFunctionNames.length > 0)

    // Get function declarations if available
    let functionDeclarations: SDKFunctionDeclaration[] = []
    if (config.functions && config.functions.length > 0) {
      // Use custom functions from config - convert to SDK format
      functionDeclarations = config.functions.map(toSDKFunctionDeclaration)
    } else if (!hasFunctionDeclarations) {
      // Only use registry functions if no specific function calling config is set
      // This allows native tools (Google Search, Code Execution) to work by default
      // Users can explicitly enable function calling by setting functions or allowedFunctionNames
    }

    // Build tools array - choose between native tools OR function calling
    // Multi-tool use is Live API only
    // Per https://ai.google.dev/gemini-api/docs/url-context#combining_with_other_tools
    // URL context can be combined with Google Search for powerful workflows
    const tools: Array<{
      googleSearch?: object
      urlContext?: object
      codeExecution?: object
      functionDeclarations?: SDKFunctionDeclaration[]
    }> = []

    if (hasFunctionDeclarations && functionDeclarations.length > 0) {
      // Function calling mode - use ONLY function declarations
      // Cannot combine with Google Search, URL Context, or Code Execution in standard API
      tools.push({ functionDeclarations })
    } else {
      // Native tools mode - use Google Search, URL Context, and Code Execution
      // Per https://ai.google.dev/gemini-api/docs/google-search
      tools.push({ googleSearch: {} }) // Real-time web search grounding

      // Per https://ai.google.dev/gemini-api/docs/url-context
      // URL Context enables fetching and analyzing content from specific URLs
      // Best combined with Google Search for broad search + deep URL analysis
      tools.push({ urlContext: {} })

      // Only enable code execution if no videos, documents, or audio are attached
      // Code execution only supports: .png, .jpeg, .csv, .xml, .cpp, .java, .py, .js, .ts
      if (!hasVideos && !hasDocuments && !hasAudios) {
        tools.push({ codeExecution: {} })
      }
    }

    // Configure function calling mode
    // Per https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
    // - VALIDATED mode guarantees function schema adherence (recommended)
    // - AUTO mode lets model decide when to call functions
    // - ANY mode forces function calls
    // - NONE mode disables function calling
    const toolConfig =
      hasFunctionDeclarations && functionDeclarations.length > 0
        ? {
            functionCallingConfig: {
              // Default to VALIDATED for guaranteed schema adherence
              // Users can override with config.functionCallingMode
              mode: toSDKFunctionCallingMode(
                config.functionCallingMode || 'VALIDATED'
              ),
              ...(config.allowedFunctionNames && {
                allowedFunctionNames: config.allowedFunctionNames
              })
            }
          }
        : undefined

    // Stream response with agentic tools and thinking
    // Per https://ai.google.dev/gemini-api/docs/thinking:
    // - thinkingLevel controls reasoning depth
    // - includeThoughts enables thought summaries
    //
    // Temperature configuration per Gemini best practices:
    // - Function calling mode: Use temperature 0 for deterministic, reliable calls
    // - Native tools mode (Google Search, Code Execution): Keep temperature 1.0 to avoid looping
    // @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
    const isUsingFunctionCalling =
      hasFunctionDeclarations && functionDeclarations.length > 0
    const temperature = isUsingFunctionCalling
      ? 0 // Low temperature for deterministic function calls
      : modelId.includes('gemini-3')
        ? 1.0 // Gemini 3 with native tools needs 1.0 to avoid looping
        : 0.4 // Older models with native tools

    const response = await ai.models.generateContentStream({
      model: modelId,
      contents,
      config: {
        tools,
        toolConfig, // Function calling mode configuration
        systemInstruction: getStandardSystemInstruction(),
        thinkingConfig: {
          thinkingLevel,
          includeThoughts
        },
        temperature
      }
    })

    let allSources: GroundingSource[] = []
    let fullText = ''
    let lastCandidate: GeminiCandidate | null = null
    // Collect all model response parts for thought signature preservation
    const collectedParts: ContentPart[] = []
    // Track processed function calls to avoid duplicates
    const processedFunctionCalls = new Set<string>()

    yield { type: 'phase', phase: 'synthesizing' }

    for await (const chunk of response) {
      const candidate = chunk.candidates?.[0]
      if (candidate) {
        lastCandidate = candidate as GeminiCandidate

        // Check finish reason per best practices
        // Per https://ai.google.dev/gemini-api/docs/function-calling#best_practices
        const finishCheck = checkFinishReason(candidate)
        if (!finishCheck.ok && finishCheck.error) {
          yield { type: 'error', error: finishCheck.error }
          return
        }
      }

      // Check for function calls in the response (only when function calling is enabled)
      // Per https://ai.google.dev/gemini-api/docs/function-calling
      // Function calling is mutually exclusive with native tools (Google Search, Code Execution)
      if (hasFunctionDeclarations && functionDeclarations.length > 0) {
        const functionCalls = extractFunctionCalls(lastCandidate)
        if (functionCalls.length > 0) {
          // Filter out already processed function calls
          const newCalls = functionCalls.filter(call => {
            const key = `${call.name}:${JSON.stringify(call.args)}`
            if (processedFunctionCalls.has(key)) return false
            processedFunctionCalls.add(key)
            return true
          })

          if (newCalls.length > 0) {
            // Emit function calls being made
            yield { type: 'function-call', functionCalls: newCalls }

            // Execute functions in parallel
            // Per https://ai.google.dev/gemini-api/docs/function-calling#parallel_function_calling
            const results = await executeFunctionCalls(newCalls)

            // Emit function results
            yield { type: 'function-result', functionResults: results }
          }
        }
      }

      // Process each part - handle text, thoughts, and function calls
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

      // Extract URL context metadata if URLs were retrieved
      // Per https://ai.google.dev/gemini-api/docs/url-context#understanding_the_response
      const urlContextMetadata = parseUrlContextMetadata(lastCandidate)
      if (urlContextMetadata && urlContextMetadata.urlMetadata?.length) {
        yield {
          type: 'url-context',
          urlContextMetadata
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
    logger.error('Gemini/Agentic', error, { mode: 'standard' })
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Request failed'
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
 * Build contents array for multi-turn conversations with multimodal support
 *
 * Per https://ai.google.dev/gemini-api/docs/thought-signatures:
 * - Gemini 3 models return thought signatures for all types of parts
 * - We must pass all signatures back as received to maintain reasoning context
 * - Don't concatenate parts with signatures together
 * - Don't merge one part with a signature with another part without a signature
 *
 * Per https://ai.google.dev/gemini-api/docs/image-understanding#tips-and-best-practices:
 * - Place text prompt AFTER image parts in the contents array
 *
 * Per https://ai.google.dev/gemini-api/docs/video-understanding#tips-and-best-practices:
 * - Place text prompt AFTER video parts in the contents array
 * - Use inline data for videos < 20MB, File API or YouTube URLs for larger/remote videos
 *
 * Per https://ai.google.dev/gemini-api/docs/document-processing#best-practices:
 * - Place text prompt AFTER document parts in the contents array
 * - Use inline data for documents <= 20MB, File API for larger documents
 *
 * Per https://ai.google.dev/gemini-api/docs/audio:
 * - Place text prompt AFTER audio parts in the contents array
 * - Use inline data for audio <= 20MB, File API for larger audio
 */
function buildContents(
  query: string,
  history?: ConversationTurn[],
  images?: ImagePart[],
  videos?: VideoPart[],
  documents?: DocumentPart[],
  audios?: AudioPart[]
): string | Array<{ role: string; parts: ContentPart[] }> {
  // If no history and no media, just return the query string
  const hasHistory = history && history.length > 0
  const hasImages = images && images.length > 0
  const hasVideos = videos && videos.length > 0
  const hasDocuments = documents && documents.length > 0
  const hasAudios = audios && audios.length > 0

  if (!hasHistory && !hasImages && !hasVideos && !hasDocuments && !hasAudios) {
    return query
  }

  const contents: Array<{ role: string; parts: ContentPart[] }> = []

  // Format history as multi-turn conversation, preserving thought signatures
  if (hasHistory) {
    for (const msg of history) {
      // If parts are provided, use them directly to preserve thought signatures
      if (msg.parts && msg.parts.length > 0) {
        contents.push({
          role: msg.role,
          parts: msg.parts
        })
      } else {
        // Fallback to simple text content (backwards compatibility)
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content || '' }]
        })
      }
    }
  }

  // Build current user message parts
  // Per Gemini docs: place media BEFORE text (order: images, videos, documents, audio, then text)
  const userParts: ContentPart[] = []

  // Add image parts first (if any)
  if (hasImages) {
    for (const img of images) {
      userParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      })
    }
  }

  // Add video parts second (if any)
  // Per https://ai.google.dev/gemini-api/docs/video-understanding
  if (hasVideos) {
    for (const vid of videos) {
      if (vid.data && vid.mimeType) {
        // Inline video (base64 data for videos < 20MB)
        userParts.push({
          inlineData: {
            mimeType: vid.mimeType,
            data: vid.data
          }
        })
      } else if (vid.fileUri) {
        // File API upload or YouTube URL
        userParts.push({
          fileData: {
            fileUri: vid.fileUri,
            mimeType: vid.mimeType
          }
        })
      }
    }
  }

  // Add document parts third (if any)
  // Per https://ai.google.dev/gemini-api/docs/document-processing
  if (hasDocuments) {
    for (const doc of documents) {
      if (doc.data && doc.mimeType) {
        // Inline document (base64 data for documents <= 20MB)
        userParts.push({
          inlineData: {
            mimeType: doc.mimeType,
            data: doc.data
          }
        })
      } else if (doc.fileUri) {
        // File API upload for larger documents
        userParts.push({
          fileData: {
            fileUri: doc.fileUri,
            mimeType: doc.mimeType
          }
        })
      }
    }
  }

  // Add audio parts fourth (if any)
  // Per https://ai.google.dev/gemini-api/docs/audio
  if (hasAudios) {
    for (const aud of audios) {
      if (aud.data && aud.mimeType) {
        // Inline audio (base64 data for audio <= 20MB)
        userParts.push({
          inlineData: {
            mimeType: aud.mimeType,
            data: aud.data
          }
        })
      } else if (aud.fileUri) {
        // File API upload for larger audio
        userParts.push({
          fileData: {
            fileUri: aud.fileUri,
            mimeType: aud.mimeType
          }
        })
      }
    }
  }

  // Add text query after media
  userParts.push({ text: query })

  contents.push({
    role: 'user',
    parts: userParts
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

    // Use retry logic for transient failures
    const result = await withGeminiRetry(
      () =>
        ai.models.generateContent({
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
        }),
      { maxRetries: 2, baseDelayMs: 500 }
    )

    const parsed = JSON.parse(result.text || '{}')
    if (Array.isArray(parsed.questions)) {
      return parsed.questions
        .slice(0, 3)
        .filter((q: unknown) => typeof q === 'string')
    }
  } catch (error) {
    logger.error('Gemini/FollowUps', error)
  }

  return []
}
