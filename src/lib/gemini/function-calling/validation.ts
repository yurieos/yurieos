/**
 * Function Argument Validation
 * Validates function arguments against their schema
 * @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
 */

import type { ParameterSchema, PropertySchema } from './types'

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate function arguments against schema
 * Per best practice: Validate at system boundaries
 */
export function validateFunctionArgs(
  args: Record<string, unknown>,
  schema: ParameterSchema
): ValidationResult {
  const errors: string[] = []

  // Check required fields
  for (const required of schema.required) {
    if (!(required in args) || args[required] === undefined) {
      errors.push(`Missing required parameter: ${required}`)
    }
  }

  // Type validation for each provided argument
  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key]
    if (!propSchema) continue // Extra fields are ok

    const typeError = validateType(value, propSchema)
    if (typeError) {
      errors.push(`${key}: ${typeError}`)
    }
  }

  return errors.length > 0
    ? { valid: false, error: errors.join('; ') }
    : { valid: true }
}

/**
 * Validate a value against a property schema
 */
function validateType(value: unknown, schema: PropertySchema): string | null {
  const actualType = typeof value

  switch (schema.type) {
    case 'string':
      if (actualType !== 'string') {
        return `expected string, got ${actualType}`
      }
      // Enum validation - per best practice: use enum for fixed value sets
      if (schema.enum && !schema.enum.includes(value as string)) {
        return `must be one of: ${schema.enum.join(', ')}`
      }
      return null

    case 'integer':
      if (actualType !== 'number' || !Number.isInteger(value)) {
        return `expected integer, got ${actualType}`
      }
      return null

    case 'number':
      if (actualType !== 'number') {
        return `expected number, got ${actualType}`
      }
      return null

    case 'boolean':
      if (actualType !== 'boolean') {
        return `expected boolean, got ${actualType}`
      }
      return null

    case 'array':
      if (!Array.isArray(value)) {
        return `expected array, got ${actualType}`
      }
      // Validate items if schema provided
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemError = validateType(value[i], schema.items)
          if (itemError) {
            return `[${i}]: ${itemError}`
          }
        }
      }
      return null

    case 'object':
      if (actualType !== 'object' || value === null || Array.isArray(value)) {
        return `expected object, got ${actualType}`
      }
      // Validate nested properties if schema provided
      if (schema.properties) {
        const objValue = value as Record<string, unknown>
        // Check required fields
        if (schema.required) {
          for (const required of schema.required) {
            if (!(required in objValue) || objValue[required] === undefined) {
              return `missing required property: ${required}`
            }
          }
        }
        // Validate each property
        for (const [key, propValue] of Object.entries(objValue)) {
          const propSchema = schema.properties[key]
          if (propSchema) {
            const propError = validateType(propValue, propSchema)
            if (propError) {
              return `${key}: ${propError}`
            }
          }
        }
      }
      return null

    default:
      return null
  }
}

/**
 * Validate a function name follows naming conventions
 * Per best practice: Use descriptive names without spaces or special characters
 */
export function validateFunctionName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Function name is required' }
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return {
      valid: false,
      error:
        'Function name must start with a letter or underscore, and contain only letters, numbers, and underscores'
    }
  }

  return { valid: true }
}
