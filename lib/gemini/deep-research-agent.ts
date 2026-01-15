/**
 * Gemini Deep Research Agent - Official Interactions API
 *
 * Implements the Gemini Deep Research Agent which autonomously plans,
 * executes, and synthesizes multi-step research tasks.
 *
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 * @see https://ai.google.dev/gemini-api/docs/interactions
 * @see https://ai.google.dev/gemini-api/docs/thinking
 *
 * Key features:
 * - Background execution with streaming progress updates
 * - Thinking summaries for real-time research progress (thinking_summaries: 'auto')
 * - Agent uses maximum reasoning depth internally
 * - Reconnection support for long-running tasks
 * - Follow-up question support via previous_interaction_id
 * - Keep-alive heartbeat to prevent connection timeouts
 *
 * Status values: completed, in_progress, requires_action, failed, cancelled
 */

import { logger } from '@/lib/utils/logger'

import { TIMING } from './constants'
import { DEEP_RESEARCH_MODEL, getGeminiClient } from './core'
import { getDeepResearchFormatInstructions } from './system-instructions'
import { DeepResearchOptions, ResearchChunk } from './types'

// ============================================
// Keep-Alive Utilities
// ============================================

/**
 * Creates an async iterator with heartbeat support
 * Yields heartbeats when no data is received within the interval
 * Prevents connection timeouts during long-running deep research tasks
 */
async function* withHeartbeat<T>(
  stream: AsyncIterable<T>,
  heartbeatIntervalMs: number = TIMING.DEEP_RESEARCH_HEARTBEAT_MS
): AsyncGenerator<{ type: 'data'; data: T } | { type: 'heartbeat' }> {
  const iterator = stream[Symbol.asyncIterator]()
  let done = false

  while (!done) {
    // Race between getting next chunk and heartbeat timeout
    const timeoutPromise = new Promise<{ type: 'heartbeat' }>(resolve => {
      setTimeout(() => resolve({ type: 'heartbeat' }), heartbeatIntervalMs)
    })

    const nextPromise = iterator.next().then(result => {
      if (result.done) {
        done = true
        return null
      }
      return { type: 'data' as const, data: result.value }
    })

    const result = await Promise.race([nextPromise, timeoutPromise])

    if (result === null) {
      // Stream ended
      break
    }

    yield result
  }
}

// ============================================
// Main Deep Research Execution
// ============================================

/**
 * Execute deep research using the official Deep Research Agent
 *
 * Uses streaming with background execution per best practices.
 * Research tasks typically take 5-20 minutes (max 60 minutes).
 *
 * @param query - The research query/topic
 * @param options - Configuration options
 * @yields ResearchChunk - Streaming chunks of progress and content
 */
export async function* executeDeepResearch(
  query: string,
  options: DeepResearchOptions = {}
): AsyncGenerator<ResearchChunk> {
  const client = getGeminiClient()
  const {
    thinkingSummaries = true,
    formatInstructions,
    previousInteractionId
  } = options

  // Build input with optional format instructions
  // Per docs: Define the desired output format explicitly in your input text
  const input = formatInstructions ? `${query}\n\n${formatInstructions}` : query

  let interactionId: string | undefined = undefined
  let lastEventId: string | undefined = undefined

  try {
    yield { type: 'phase', phase: 'understanding' }
    yield {
      type: 'progress',
      content: 'Starting deep research... This may take several minutes.',
      phase: 'understanding'
    }

    // Start streaming research with background execution
    // Per docs: You must use background execution (set background=true)
    const stream = await client.interactions.create({
      input,
      agent: DEEP_RESEARCH_MODEL,
      background: true,
      stream: true,
      agent_config: {
        type: 'deep-research',
        thinking_summaries: thinkingSummaries ? 'auto' : undefined
      },
      ...(previousInteractionId && {
        previous_interaction_id: previousInteractionId
      })
    })

    yield { type: 'phase', phase: 'searching' }

    // Wrap stream with heartbeat to prevent connection timeouts
    // Deep research can take 5-60 minutes with long gaps between events
    for await (const wrappedChunk of withHeartbeat(stream)) {
      // Handle heartbeat - send keep-alive progress to prevent connection timeout
      if (wrappedChunk.type === 'heartbeat') {
        yield {
          type: 'progress',
          content: 'Research in progress...',
          phase: 'synthesizing',
          metadata: interactionId ? { interactionId } : undefined
        }
        continue
      }

      // Extract actual chunk data
      const chunk = wrappedChunk.data

      // Capture interaction ID for reconnection/follow-ups
      // Per docs: Watch for event: interaction.start to get the interaction ID
      if (chunk.event_type === 'interaction.start') {
        interactionId = chunk.interaction?.id
        if (interactionId) {
          yield {
            type: 'progress',
            content: 'Research task initiated. Planning search strategy...',
            phase: 'searching',
            metadata: { interactionId }
          }
        }
      }

      // Track event ID for potential reconnection
      // Per docs: Watch for "event_id" fields to get the LAST_EVENT_ID
      if (chunk.event_id) {
        lastEventId = chunk.event_id
      }

      // Handle content deltas
      // Per https://ai.google.dev/gemini-api/docs/interactions - streaming events
      if (chunk.event_type === 'content.delta') {
        const delta = chunk.delta as
          | {
              type?: string
              text?: string
              thought?: string
              content?: { text?: string }
            }
          | undefined

        if (delta?.type === 'text' && delta.text) {
          yield { type: 'content', content: delta.text }
        } else if (delta?.type === 'thought' && delta.thought) {
          // General thinking output (from Interactions API)
          yield { type: 'thought', content: delta.thought }
          yield {
            type: 'progress',
            content: delta.thought,
            phase: 'synthesizing'
          }
        } else if (delta?.type === 'thought_summary') {
          // Deep Research specific thinking summaries
          // Per Deep Research docs: chunk.delta.content.text
          const thoughtText = delta.content?.text
          if (thoughtText) {
            yield { type: 'thought', content: thoughtText }
            yield {
              type: 'progress',
              content: thoughtText,
              phase: 'synthesizing'
            }
          }
        }
      }

      // Handle errors - use type assertion for error event
      if (chunk.event_type === 'error') {
        const errorChunk = chunk as { error?: { message?: string } }
        yield {
          type: 'error',
          error: errorChunk.error?.message || 'Research encountered an error'
        }
        return
      }

      // Handle completion
      if (chunk.event_type === 'interaction.complete') {
        yield { type: 'phase', phase: 'complete' }
      }
    }

    yield {
      type: 'complete',
      metadata: {
        interactionId: interactionId || undefined,
        lastEventId: lastEventId || undefined
      }
    }
  } catch (error) {
    logger.error('Gemini/DeepResearch', error)

    // If we have an interaction ID, include it for potential reconnection
    if (interactionId) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Deep research failed',
        metadata: { interactionId, lastEventId: lastEventId || undefined }
      }
    } else {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Deep research failed'
      }
    }
  }
}

// ============================================
// Reconnection Support
// ============================================

/**
 * Reconnect to an in-progress or completed research task
 *
 * Per https://ai.google.dev/gemini-api/docs/deep-research#reconnecting-to-stream:
 * - Use interactions.get with stream=true and last_event_id to resume streaming
 * - The interaction ID is acquired from the interaction.start event
 * - The last event ID tells the server to resume after that specific point
 *
 * Use this when:
 * - Network interruption occurred during a long research task
 * - Browser was refreshed during research
 * - User returns to check on a running task
 *
 * @param interactionId - The interaction ID from a previous session
 * @param lastEventId - Optional last event ID for resuming from specific point
 * @yields ResearchChunk - Streaming chunks of progress and content
 */
export async function* reconnectToResearch(
  interactionId: string,
  lastEventId?: string
): AsyncGenerator<ResearchChunk> {
  const client = getGeminiClient()

  try {
    yield {
      type: 'progress',
      content: 'Reconnecting to research task...',
      phase: 'searching',
      metadata: { interactionId, lastEventId }
    }

    // First check the current status without streaming
    const interaction = await client.interactions.get(interactionId)
    const status = interaction.status as string

    // Handle already completed research
    if (status === 'completed') {
      yield {
        type: 'progress',
        content: 'Research completed. Loading results...',
        phase: 'complete',
        metadata: { interactionId }
      }

      // Extract and emit the final output
      const outputs = interaction.outputs as
        | Array<{ type?: string; text?: string }>
        | undefined
      const textOutput = outputs?.find(o => o.type === 'text')
      if (textOutput?.text) {
        yield { type: 'content', content: textOutput.text }
      }

      yield {
        type: 'complete',
        metadata: { interactionId }
      }
      return
    }

    // Handle failed or cancelled research
    if (status === 'failed' || status === 'cancelled') {
      yield {
        type: 'error',
        error: `Research task ${status}. Please start a new research.`,
        metadata: { interactionId }
      }
      return
    }

    // Still in progress - resume streaming
    // Per docs: Use interactions.get with stream=true and last_event_id
    yield {
      type: 'progress',
      content: 'Research in progress. Resuming stream...',
      phase: 'synthesizing',
      metadata: { interactionId }
    }

    // Resume streaming from last event if provided
    // Per https://ai.google.dev/gemini-api/docs/deep-research#reconnecting-to-stream
    const stream = await client.interactions.get(interactionId, {
      stream: true,
      ...(lastEventId && { last_event_id: lastEventId })
    })

    let currentLastEventId: string | undefined = lastEventId

    // Wrap stream with heartbeat to prevent connection timeouts
    for await (const wrappedChunk of withHeartbeat(stream)) {
      // Handle heartbeat - send keep-alive progress
      if (wrappedChunk.type === 'heartbeat') {
        yield {
          type: 'progress',
          content: 'Research in progress...',
          phase: 'synthesizing',
          metadata: { interactionId, lastEventId: currentLastEventId }
        }
        continue
      }

      // Extract actual chunk data
      const chunk = wrappedChunk.data

      // Track event ID for potential future reconnection
      if (chunk.event_id) {
        currentLastEventId = chunk.event_id
      }

      // Handle content deltas (same as executeDeepResearch)
      if (chunk.event_type === 'content.delta') {
        const delta = chunk.delta as
          | {
              type?: string
              text?: string
              thought?: string
              content?: { text?: string }
            }
          | undefined

        if (delta?.type === 'text' && delta.text) {
          yield { type: 'content', content: delta.text }
        } else if (delta?.type === 'thought' && delta.thought) {
          yield { type: 'thought', content: delta.thought }
          yield {
            type: 'progress',
            content: delta.thought,
            phase: 'synthesizing'
          }
        } else if (delta?.type === 'thought_summary') {
          // Per Deep Research docs: chunk.delta.content.text
          const thoughtText = delta.content?.text
          if (thoughtText) {
            yield { type: 'thought', content: thoughtText }
            yield {
              type: 'progress',
              content: thoughtText,
              phase: 'synthesizing'
            }
          }
        }
      }

      // Handle errors
      if (chunk.event_type === 'error') {
        const errorChunk = chunk as { error?: { message?: string } }
        yield {
          type: 'error',
          error: errorChunk.error?.message || 'Research encountered an error',
          metadata: { interactionId, lastEventId: currentLastEventId }
        }
        return
      }

      // Handle completion
      if (chunk.event_type === 'interaction.complete') {
        yield { type: 'phase', phase: 'complete' }
      }
    }

    yield {
      type: 'complete',
      metadata: {
        interactionId,
        lastEventId: currentLastEventId
      }
    }
  } catch (error) {
    logger.error('Gemini/DeepResearch', error, { action: 'reconnection' })
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Reconnection failed',
      metadata: { interactionId, lastEventId }
    }
  }
}

// ============================================
// Follow-up Questions
// ============================================

/**
 * Ask a follow-up question on a completed research task
 *
 * Per docs: You can continue the conversation after the agent returns
 * the final report by using the previous_interaction_id
 *
 * @param question - The follow-up question
 * @param previousInteractionId - The ID of the completed research interaction
 * @yields ResearchChunk - Response to the follow-up
 */
export async function* askFollowUp(
  question: string,
  previousInteractionId: string
): AsyncGenerator<ResearchChunk> {
  const client = getGeminiClient()

  try {
    yield {
      type: 'progress',
      content: 'Processing follow-up question...',
      phase: 'synthesizing'
    }

    // Follow-ups can use the agent directly without background
    // Per docs example: Uses agent without background for follow-ups
    const interaction = await client.interactions.create({
      input: question,
      agent: DEEP_RESEARCH_MODEL,
      previous_interaction_id: previousInteractionId
    })

    // Extract text from outputs
    // Per https://ai.google.dev/gemini-api/docs/interactions - outputs have type property
    const outputs = interaction.outputs as
      | Array<{ type?: string; text?: string }>
      | undefined
    const textOutput = outputs?.find(o => o.type === 'text')
    if (textOutput?.text) {
      yield { type: 'content', content: textOutput.text }
    }

    yield {
      type: 'complete',
      metadata: {
        interactionId: interaction.id,
        previousInteractionId
      }
    }
  } catch (error) {
    logger.error('Gemini/DeepResearch', error, { action: 'follow-up' })
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Follow-up failed'
    }
  }
}
