import { Redis } from '@upstash/redis'

// Retry utilities
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 200
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === maxRetries || !isTransientError(error)) break
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(baseDelayMs * 2 ** attempt, 2000))
      )
    }
  }
  throw lastError
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return [
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'rate limit',
    '429',
    '500',
    '502',
    '503',
    '504'
  ].some(e => msg.includes(e))
}

// Configuration
export type RedisConfig = {
  upstashRedisRestUrl?: string
  upstashRedisRestToken?: string
}
export const redisConfig: RedisConfig = {
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN
}

let redisClient: Redis | null = null
let redisWrapper: RedisWrapper | null = null

export function isRedisConfigured(): boolean {
  return !!(
    redisConfig.upstashRedisRestUrl && redisConfig.upstashRedisRestToken
  )
}

export class RedisWrapper {
  private client: Redis
  constructor(client: Redis) {
    this.client = client
  }

  private retry<T>(operation: () => Promise<T>, name: string): Promise<T> {
    return withRetry(operation, 2, 200)
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev: boolean }
  ): Promise<string[]> {
    return this.retry(
      () => this.client.zrange(key, start, stop, options),
      'zrange'
    )
  }

  async hgetall<T extends Record<string, unknown>>(
    key: string
  ): Promise<T | null> {
    return this.retry(
      () => this.client.hgetall(key) as Promise<T | null>,
      'hgetall'
    )
  }

  pipeline() {
    return new PipelineWrapper(this.client.pipeline())
  }

  async hmset(
    key: string,
    value: Record<string, unknown>
  ): Promise<'OK' | number> {
    return this.retry(() => this.client.hmset(key, value), 'hmset')
  }

  async zadd(
    key: string,
    score: number,
    member: string
  ): Promise<number | null> {
    return this.retry(() => this.client.zadd(key, { score, member }), 'zadd')
  }

  async del(key: string): Promise<number> {
    return this.retry(() => this.client.del(key), 'del')
  }

  async zrem(key: string, member: string): Promise<number> {
    return this.retry(() => this.client.zrem(key, member), 'zrem')
  }
}

class PipelineWrapper {
  private pipeline: ReturnType<Redis['pipeline']>
  constructor(pipeline: ReturnType<Redis['pipeline']>) {
    this.pipeline = pipeline
  }

  hgetall(key: string) {
    this.pipeline.hgetall(key)
    return this
  }
  del(key: string) {
    this.pipeline.del(key)
    return this
  }
  zrem(key: string, member: string) {
    this.pipeline.zrem(key, member)
    return this
  }
  hmset(key: string, value: Record<string, unknown>) {
    this.pipeline.hmset(key, value)
    return this
  }
  zadd(key: string, score: number, member: string) {
    this.pipeline.zadd(key, { score, member })
    return this
  }

  async exec() {
    return withRetry(() => this.pipeline.exec(), 2, 200)
  }
}

export async function getRedisClient(): Promise<RedisWrapper> {
  if (redisWrapper) return redisWrapper
  if (!isRedisConfigured()) {
    throw new Error(
      'Upstash Redis configuration is missing. Please check your environment variables.'
    )
  }
  try {
    if (
      !redisConfig.upstashRedisRestUrl ||
      !redisConfig.upstashRedisRestToken
    ) {
      throw new Error('Redis configuration missing')
    }
    redisClient = new Redis({
      url: redisConfig.upstashRedisRestUrl,
      token: redisConfig.upstashRedisRestToken
    })
    redisWrapper = new RedisWrapper(redisClient)
  } catch (error) {
    console.error(
      'Failed to connect to Upstash Redis:',
      error instanceof Error ? error.message : error
    )
    throw new Error(
      'Failed to connect to Upstash Redis. Check your configuration and credentials.'
    )
  }
  return redisWrapper
}

export async function getSafeRedisClient(): Promise<RedisWrapper | null> {
  if (!isRedisConfigured()) return null
  try {
    return await getRedisClient()
  } catch {
    return null
  }
}
