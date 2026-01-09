import { NextResponse } from 'next/server'

import { isGeminiAvailable } from '@/lib/gemini'
import { getSafeRedisClient, isRedisConfigured } from '@/lib/redis/config'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * Health check response structure
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    gemini: { available: boolean }
    redis: { configured: boolean; connected: boolean }
    supabase: { configured: boolean }
  }
}

/**
 * Health check endpoint for monitoring and deployment verification
 *
 * Returns:
 * - 200 OK with status "healthy" when Gemini is available
 * - 503 Service Unavailable with status "unhealthy" when Gemini is not available
 *
 * Optional services (Redis, Supabase) don't affect overall health status
 * but their status is included for debugging.
 *
 * @example
 * GET /api/health
 * Response: { "status": "healthy", "timestamp": "...", "services": { ... } }
 */
export async function GET() {
  const geminiAvailable = isGeminiAvailable()
  const redisConfigured = isRedisConfigured()
  const supabaseConfigured = isSupabaseConfigured()

  // Check Redis connection if configured
  let redisConnected = false
  if (redisConfigured) {
    try {
      const redis = await getSafeRedisClient()
      redisConnected = redis !== null
    } catch {
      redisConnected = false
    }
  }

  // Gemini is required, others are optional enhancements
  const status: HealthStatus['status'] = geminiAvailable
    ? 'healthy'
    : 'unhealthy'

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      gemini: { available: geminiAvailable },
      redis: { configured: redisConfigured, connected: redisConnected },
      supabase: { configured: supabaseConfigured }
    }
  }

  return NextResponse.json(health, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json'
    }
  })
}
