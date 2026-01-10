/**
 * Function Calling Module
 * Main entry point for Gemini Function Calling API
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

// Types
export type {
  FunctionCall,
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionResponse,
  ParameterSchema,
  PropertySchema,
  RegisteredFunction
} from './types'

// Registry
export { FunctionRegistry, functionRegistry } from './registry'

// Executor
export {
  buildFunctionResponseParts,
  checkFinishReason,
  executeFunctionCalls,
  extractFunctionCalls,
  hasFunctionCalls
} from './executor'

// Validation
export type { ValidationResult } from './validation'
export { validateFunctionArgs, validateFunctionName } from './validation'

// Built-in functions
export {
  calculatorFunction,
  datetimeFunction,
  registerBuiltInFunctions
} from './functions'
