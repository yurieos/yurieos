/**
 * DateTime Function
 * Provides time-aware capabilities for the model
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

import type { RegisteredFunction } from '../types'

/**
 * DateTime function - provides time-aware capabilities
 * Per best practice: Enum for actions, clear descriptions with examples
 */
export const datetimeFunction: RegisteredFunction = {
  declaration: {
    name: 'get_datetime',
    description:
      'Gets current date/time or performs date calculations. Use for any time-sensitive queries.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['current', 'format', 'difference', 'add'],
          description:
            'Action: current (get now), format (parse/format date), difference (between dates), add (add time to date)'
        },
        timezone: {
          type: 'string',
          description:
            "IANA timezone (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC."
        },
        date: {
          type: 'string',
          description:
            "ISO date string for format/difference/add (e.g., '2026-01-15T10:30:00Z')"
        },
        date2: {
          type: 'string',
          description: 'Second ISO date for difference calculation'
        },
        amount: {
          type: 'integer',
          description: 'Amount to add (for add action)'
        },
        unit: {
          type: 'string',
          enum: ['days', 'weeks', 'months', 'years', 'hours', 'minutes'],
          description: 'Unit for add action'
        },
        format: {
          type: 'string',
          description:
            "Output format: 'iso', 'date', 'time', 'datetime', 'relative'. Default: 'datetime'"
        }
      },
      required: ['action']
    }
  },
  requiresValidation: true,
  maxExecutionTimeMs: 5000,
  handler: async args => {
    const {
      action,
      timezone = 'UTC',
      date,
      date2,
      amount,
      unit,
      format = 'datetime'
    } = args as Record<string, string | number | undefined>

    const formatDate = (d: Date, fmt: string, tz: string): string => {
      try {
        const options: Intl.DateTimeFormatOptions = { timeZone: tz }
        switch (fmt) {
          case 'iso':
            return d.toISOString()
          case 'date':
            return d.toLocaleDateString('en-US', {
              ...options,
              dateStyle: 'full'
            })
          case 'time':
            return d.toLocaleTimeString('en-US', {
              ...options,
              timeStyle: 'medium'
            })
          default:
            return d.toLocaleString('en-US', {
              ...options,
              dateStyle: 'full',
              timeStyle: 'medium'
            })
        }
      } catch {
        // Fallback for invalid timezone
        return d.toISOString()
      }
    }

    switch (action) {
      case 'current': {
        const now = new Date()
        return {
          result: formatDate(now, format as string, timezone as string),
          iso: now.toISOString(),
          timezone,
          timestamp: now.getTime()
        }
      }

      case 'format': {
        if (!date) return { error: 'date is required for format action' }
        const parsed = new Date(date as string)
        if (Number.isNaN(parsed.getTime()))
          return { error: 'Invalid date format' }
        return {
          result: formatDate(parsed, format as string, timezone as string),
          iso: parsed.toISOString()
        }
      }

      case 'difference': {
        if (!date || !date2)
          return { error: 'date and date2 are required for difference' }
        const d1 = new Date(date as string)
        const d2 = new Date(date2 as string)
        if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
          return { error: 'Invalid date format' }
        }
        const diffMs = d2.getTime() - d1.getTime()
        return {
          milliseconds: diffMs,
          seconds: Math.floor(diffMs / 1000),
          minutes: Math.floor(diffMs / 60000),
          hours: Math.floor(diffMs / 3600000),
          days: Math.floor(diffMs / 86400000),
          weeks: Math.floor(diffMs / 604800000)
        }
      }

      case 'add': {
        if (!date || amount === undefined || !unit) {
          return { error: 'date, amount, and unit are required for add' }
        }
        const baseDate = new Date(date as string)
        if (Number.isNaN(baseDate.getTime()))
          return { error: 'Invalid date format' }

        const result = new Date(baseDate)
        switch (unit) {
          case 'minutes':
            result.setMinutes(result.getMinutes() + (amount as number))
            break
          case 'hours':
            result.setHours(result.getHours() + (amount as number))
            break
          case 'days':
            result.setDate(result.getDate() + (amount as number))
            break
          case 'weeks':
            result.setDate(result.getDate() + (amount as number) * 7)
            break
          case 'months':
            result.setMonth(result.getMonth() + (amount as number))
            break
          case 'years':
            result.setFullYear(result.getFullYear() + (amount as number))
            break
          default:
            return { error: `Unknown unit: ${unit}` }
        }
        return {
          result: formatDate(result, format as string, timezone as string),
          iso: result.toISOString(),
          timestamp: result.getTime()
        }
      }

      default:
        return { error: `Unknown action: ${action}` }
    }
  }
}
