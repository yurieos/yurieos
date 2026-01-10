/**
 * Function Registry
 * Manages function declarations and execution for Gemini Function Calling
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

import {
  FunctionDeclaration,
  FunctionResponse,
  RegisteredFunction
} from './types'

/**
 * Function Registry - manages function declarations and execution
 * Best practice: Keep active set to 10-20 functions max
 * @see https://ai.google.dev/gemini-api/docs/function-calling#best_practices
 */
class FunctionRegistry {
  private functions = new Map<string, RegisteredFunction>()

  /**
   * Register a function
   * @throws Error if function name is invalid
   */
  register(fn: RegisteredFunction): void {
    // Validate name format (no spaces, periods, dashes)
    // Per best practice: Use descriptive names without spaces or special characters
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fn.declaration.name)) {
      throw new Error(
        `Invalid function name: ${fn.declaration.name}. Use underscores or camelCase, no spaces/periods/dashes.`
      )
    }
    this.functions.set(fn.declaration.name, fn)
  }

  /**
   * Unregister a function by name
   */
  unregister(name: string): boolean {
    return this.functions.delete(name)
  }

  /**
   * Get a registered function by name
   */
  get(name: string): RegisteredFunction | undefined {
    return this.functions.get(name)
  }

  /**
   * Check if a function is registered
   */
  has(name: string): boolean {
    return this.functions.has(name)
  }

  /**
   * Get all function declarations for API
   * Used when sending tools to Gemini
   */
  getDeclarations(): FunctionDeclaration[] {
    return Array.from(this.functions.values()).map(f => f.declaration)
  }

  /**
   * Get declarations for specific function names
   * Per best practice: Limit active set to 10-20 functions
   */
  getDeclarationsFor(names: string[]): FunctionDeclaration[] {
    return names
      .map(name => this.functions.get(name)?.declaration)
      .filter((d): d is FunctionDeclaration => d !== undefined)
  }

  /**
   * Get all registered function names
   */
  getNames(): string[] {
    return Array.from(this.functions.keys())
  }

  /**
   * Get count of registered functions
   */
  get size(): number {
    return this.functions.size
  }

  /**
   * Execute a function by name
   * Includes timeout protection per best practices
   */
  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<FunctionResponse> {
    const fn = this.functions.get(name)
    if (!fn) {
      // Return informative error per best practices
      return { name, response: { error: `Unknown function: ${name}` } }
    }

    try {
      const result = await Promise.race([
        fn.handler(args),
        this.timeout(fn.maxExecutionTimeMs || 30000, name)
      ])
      return { name, response: { result } }
    } catch (error) {
      // Return informative error messages per best practices
      return {
        name,
        response: {
          error: error instanceof Error ? error.message : 'Execution failed'
        }
      }
    }
  }

  /**
   * Create a timeout promise that rejects after the specified time
   */
  private timeout(ms: number, name: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Function ${name} timed out after ${ms}ms`)),
        ms
      )
    )
  }

  /**
   * Clear all registered functions
   */
  clear(): void {
    this.functions.clear()
  }
}

// Singleton instance for application-wide function registry
export const functionRegistry = new FunctionRegistry()

// Export class for testing and custom registries
export { FunctionRegistry }
