/**
 * Google GenAI SDK Client - Singleton Instance
 * Simplified: One client for all Gemini operations
 */

import { GoogleGenAI } from '@google/genai'

// Singleton client instance
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
