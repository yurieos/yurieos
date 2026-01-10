/**
 * Function Calling Types
 * TypeScript types for Gemini Function Calling API
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

/**
 * Function declaration per OpenAPI subset schema
 * @see https://ai.google.dev/gemini-api/docs/function-calling#function_declarations
 */
export interface FunctionDeclaration {
  /** Unique name - use underscores/camelCase, no spaces/periods/dashes */
  name: string
  /** Clear, detailed description - crucial for model understanding */
  description: string
  /** Parameter definitions */
  parameters: ParameterSchema
}

/**
 * Parameter schema for function declarations
 */
export interface ParameterSchema {
  type: 'object'
  properties: Record<string, PropertySchema>
  required: string[]
}

/**
 * Property schema for individual parameters
 * Per best practice: Use specific types and enums for fixed value sets
 */
export interface PropertySchema {
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  /** Use enum for fixed value sets - improves accuracy */
  enum?: string[]
  /** For array types - defines item schema */
  items?: PropertySchema
  /** For nested object types */
  properties?: Record<string, PropertySchema>
  /** For nested object types - required fields */
  required?: string[]
}

/**
 * Function call from model response
 */
export interface FunctionCall {
  name: string
  args: Record<string, unknown>
}

/**
 * Function response to send back to model
 */
export interface FunctionResponse {
  name: string
  response: Record<string, unknown>
}

/**
 * Function calling modes per docs
 * @see https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
 *
 * - AUTO (default): Model decides when to call functions
 * - ANY: Force function calls, guarantees schema adherence
 * - NONE: Disable function calling
 * - VALIDATED (Preview): Schema adherence guaranteed for both function calls and text
 */
export type FunctionCallingMode = 'AUTO' | 'ANY' | 'NONE' | 'VALIDATED'

/**
 * Registered function with handler
 * Used by FunctionRegistry to manage functions
 */
export interface RegisteredFunction {
  /** Function declaration for the API */
  declaration: FunctionDeclaration
  /** Handler function that executes the function */
  handler: (
    args: Record<string, unknown>
  ) => Promise<FunctionResponse['response']>
  /** Whether to validate arguments before execution */
  requiresValidation?: boolean
  /** Maximum execution time in milliseconds (default: 30000) */
  maxExecutionTimeMs?: number
}
