/**
 * Calculator Function
 * Extends model capabilities with mathematical operations
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */

import { RegisteredFunction } from '../types'

/**
 * Calculator function - extends model capabilities
 * Per best practice: Use enum for fixed operation set
 */
export const calculatorFunction: RegisteredFunction = {
  declaration: {
    name: 'calculate',
    description:
      'Performs mathematical calculations. Use for arithmetic, percentages, powers, and basic math operations.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'add',
            'subtract',
            'multiply',
            'divide',
            'percentage',
            'power',
            'sqrt',
            'abs',
            'round',
            'floor',
            'ceil'
          ],
          description: 'The mathematical operation to perform'
        },
        operands: {
          type: 'array',
          items: { type: 'number', description: 'Numeric value' },
          description:
            'Numbers to operate on. For binary ops like add: [a, b]. For percentage: [value, percentage]. For unary ops like sqrt: [value].'
        }
      },
      required: ['operation', 'operands']
    }
  },
  requiresValidation: true,
  maxExecutionTimeMs: 5000,
  handler: async args => {
    const { operation, operands } = args as {
      operation: string
      operands: number[]
    }

    if (!operands || operands.length === 0) {
      return { error: 'No operands provided' }
    }

    switch (operation) {
      case 'add':
        return { result: operands.reduce((a, b) => a + b, 0) }

      case 'subtract':
        if (operands.length < 2) {
          return { error: 'Subtract requires at least 2 operands' }
        }
        return { result: operands.reduce((a, b) => a - b) }

      case 'multiply':
        return { result: operands.reduce((a, b) => a * b, 1) }

      case 'divide':
        if (operands.length < 2) {
          return { error: 'Divide requires at least 2 operands' }
        }
        if (operands.slice(1).some(n => n === 0)) {
          return { error: 'Division by zero' }
        }
        return { result: operands.reduce((a, b) => a / b) }

      case 'percentage':
        if (operands.length < 2) {
          return { error: 'Percentage requires [value, percentage]' }
        }
        return { result: (operands[0] * operands[1]) / 100 }

      case 'power':
        if (operands.length < 2) {
          return { error: 'Power requires [base, exponent]' }
        }
        return { result: Math.pow(operands[0], operands[1]) }

      case 'sqrt':
        if (operands[0] < 0) {
          return { error: 'Cannot compute square root of negative number' }
        }
        return { result: Math.sqrt(operands[0]) }

      case 'abs':
        return { result: Math.abs(operands[0]) }

      case 'round':
        return { result: Math.round(operands[0]) }

      case 'floor':
        return { result: Math.floor(operands[0]) }

      case 'ceil':
        return { result: Math.ceil(operands[0]) }

      default:
        return { error: `Unknown operation: ${operation}` }
    }
  }
}
