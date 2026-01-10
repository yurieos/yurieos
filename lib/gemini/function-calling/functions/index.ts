/**
 * Built-in Functions
 * Register and export all built-in functions
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

import { functionRegistry } from '../registry'

import { calculatorFunction } from './calculator'
import { datetimeFunction } from './datetime'

/**
 * Register all built-in functions
 * Called on module initialization
 */
export function registerBuiltInFunctions(): void {
  functionRegistry.register(calculatorFunction)
  functionRegistry.register(datetimeFunction)
}

export { calculatorFunction, datetimeFunction }
