/**
 * Wolfram Alpha LLM API Tool
 *
 * Provides computational knowledge and data analysis capabilities:
 * - Mathematical calculations and symbolic computation
 * - Scientific data and unit conversions
 * - Statistical analysis and data visualization descriptions
 * - Real-world facts, measurements, and comparisons
 *
 * @see https://products.wolframalpha.com/llm-api/documentation
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const WOLFRAM_LLM_API_BASE = "https://www.wolframalpha.com/api/v1/llm-api";
const MAX_RESPONSE_LENGTH = 8000; // Reasonable limit for LLM context

// Regex patterns for parsing responses (declared at top level for performance)
const DID_YOU_MEAN_REGEX = /Did you mean[:\s]+(.+)/i;
const SUGGESTION_SPLIT_REGEX = /[,;]/;

// =============================================================================
// Helpers
// =============================================================================

function getAppId(): string {
  const appId = process.env.WOLFRAM_ALPHA_APP_ID;
  if (!appId) {
    throw new Error(
      "Wolfram Alpha is enabled, but WOLFRAM_ALPHA_APP_ID is not set. " +
        "Add WOLFRAM_ALPHA_APP_ID to your environment to use computational knowledge."
    );
  }
  return appId;
}

function truncateResponse(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  // Try to cut at a reasonable boundary (newline or sentence)
  const lastNewline = truncated.lastIndexOf("\n");
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = Math.max(lastNewline, lastPeriod);
  const finalCut = cutPoint > maxLength * 0.7 ? cutPoint + 1 : maxLength;
  return `${truncated.slice(0, finalCut)}\n\n[... response truncated for length ...]`;
}

function formatWolframResponse(result: string): string {
  // The LLM API already returns well-formatted text
  // Just ensure it's clean and properly structured
  const lines = result.split("\n").map((line) => line.trim());
  const formatted = lines.filter((line) => line.length > 0).join("\n");
  return truncateResponse(formatted, MAX_RESPONSE_LENGTH);
}

// =============================================================================
// Tool: Compute
// =============================================================================

export type ComputeToolResult = {
  success: boolean;
  query: string;
  result: string;
  suggestions?: string[];
  error?: string;
};

export const computeTool = tool({
  description:
    "Query Wolfram Alpha for computational knowledge, mathematical calculations, " +
    "scientific data, unit conversions, statistics, and real-world facts. " +
    "Use this for precise calculations, data lookups, and verified factual information. " +
    "Examples: solve equations, convert units, get physical constants, compare statistics, " +
    "analyze mathematical expressions, lookup chemical properties, astronomical data, etc.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "A natural language query or mathematical expression. " +
          "Examples: 'integrate x^2 sin(x)', 'mass of the sun in kg', " +
          "'GDP of Japan vs Germany', 'solve x^2 + 5x + 6 = 0', " +
          "'convert 100 miles to kilometers', 'calories in an apple'"
      ),
    units: z
      .string()
      .optional()
      .describe(
        "Optional preferred unit system: 'metric' or 'imperial'. " +
          "Affects how results are displayed for physical quantities."
      ),
  }),
  execute: async ({ query, units }) => {
    try {
      const appId = getAppId();

      // Build the API URL with query parameters
      const params = new URLSearchParams({
        appid: appId,
        input: query,
        // Request maximum width for detailed responses
        maxchars: "8000",
      });

      // Add optional unit preference
      if (units === "metric") {
        params.append("units", "metric");
      } else if (units === "imperial") {
        params.append("units", "nonmetric");
      }

      const url = `${WOLFRAM_LLM_API_BASE}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/plain",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle specific error cases
        if (response.status === 403) {
          return {
            success: false,
            query,
            result: "",
            error:
              "Invalid Wolfram Alpha App ID. Please check your WOLFRAM_ALPHA_APP_ID.",
          } satisfies ComputeToolResult;
        }

        if (response.status === 501) {
          return {
            success: false,
            query,
            result: "",
            error:
              "Wolfram Alpha could not understand this query. Try rephrasing it.",
          } satisfies ComputeToolResult;
        }

        return {
          success: false,
          query,
          result: "",
          error: `Wolfram Alpha API error (${response.status}): ${errorText || response.statusText}`,
        } satisfies ComputeToolResult;
      }

      const resultText = await response.text();

      // Check for "no result" responses
      if (
        !resultText ||
        resultText.includes("Wolfram|Alpha did not understand") ||
        resultText.includes("No result available")
      ) {
        // Try to extract suggestions if available
        const suggestionMatch = resultText.match(DID_YOU_MEAN_REGEX);
        const suggestions = suggestionMatch
          ? suggestionMatch[1]
              .split(SUGGESTION_SPLIT_REGEX)
              .map((s) => s.trim())
          : undefined;

        return {
          success: false,
          query,
          result: "",
          suggestions,
          error:
            "Wolfram Alpha could not find a result for this query. " +
            (suggestions
              ? `Did you mean: ${suggestions.join(", ")}?`
              : "Try rephrasing your question."),
        } satisfies ComputeToolResult;
      }

      const formattedResult = formatWolframResponse(resultText);

      return {
        success: true,
        query,
        result: formattedResult,
      } satisfies ComputeToolResult;
    } catch (error) {
      return {
        success: false,
        query,
        result: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ComputeToolResult;
    }
  },
});
