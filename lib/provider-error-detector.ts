/**
 * Provider-specific error detection utility for streaming responses
 * Detects error patterns embedded in streaming content from various AI providers
 */

export type DetectedError = {
  type: string;
  provider: string;
  message: string;
  userFriendlyMessage: string;
  isQuotaExceeded?: boolean;
  isInsufficientBalance?: boolean;
  isAuthError?: boolean;
  isContentPolicyViolation?: boolean;
};

/**
 * Detect and parse OpenAI-style errors from error objects or messages
 */
export function detectProviderError(error: unknown): DetectedError | null {
  // Handle string that looks like JSON error
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error);
      return detectFromParsedError(parsed);
    } catch {
      // Check if it's a content policy message in plain text
      if (
        error.includes("limited access to this content for safety reasons") ||
        error.includes("invalid_prompt")
      ) {
        return {
          type: "content_policy_violation",
          provider: "openai",
          message: error,
          userFriendlyMessage:
            "This request was blocked by the AI provider's content policy. Please try rephrasing your message.",
          isContentPolicyViolation: true,
        };
      }
      return null;
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    const errorMessage = error.message;

    // Check for content policy violation in error message
    if (
      errorMessage.includes(
        "limited access to this content for safety reasons"
      ) ||
      errorMessage.includes("invalid_prompt") ||
      errorMessage.includes("Invalid prompt")
    ) {
      return {
        type: "content_policy_violation",
        provider: "openai",
        message: errorMessage,
        userFriendlyMessage:
          "This request was blocked by the AI provider's content policy. Please try rephrasing your message.",
        isContentPolicyViolation: true,
      };
    }

    // Try to parse JSON from error message
    try {
      const parsed = JSON.parse(errorMessage);
      return detectFromParsedError(parsed);
    } catch {
      // Not a JSON error
    }
  }

  // Handle plain objects (already parsed)
  if (error && typeof error === "object") {
    return detectFromParsedError(error);
  }

  return null;
}

/**
 * Detect error from a parsed JSON object
 */
function detectFromParsedError(parsed: unknown): DetectedError | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // Handle OpenAI-style error structure: { type: "error", error: { type, code, message } }
  if (obj.type === "error" && obj.error && typeof obj.error === "object") {
    const errorObj = obj.error as Record<string, unknown>;
    return detectFromErrorObject(errorObj, "openai");
  }

  // Handle direct error object: { type, code, message }
  if (obj.type || obj.code || obj.message) {
    return detectFromErrorObject(obj, "unknown");
  }

  return null;
}

/**
 * Detect error from an error object with type/code/message fields
 */
function detectFromErrorObject(
  errorObj: Record<string, unknown>,
  provider: string
): DetectedError | null {
  const errorType = String(errorObj.type || "");
  const errorCode = String(errorObj.code || "");
  const errorMessage = String(errorObj.message || "");

  // OpenAI content policy / invalid prompt errors
  if (
    errorCode === "invalid_prompt" ||
    (errorType === "invalid_request_error" &&
      errorMessage.includes(
        "limited access to this content for safety reasons"
      ))
  ) {
    return {
      type: "content_policy_violation",
      provider: "openai",
      message: errorMessage,
      userFriendlyMessage:
        "This request was blocked by the AI provider's content policy. Please try rephrasing your message.",
      isContentPolicyViolation: true,
    };
  }

  // Rate limiting / quota errors
  if (
    errorCode === "rate_limit_exceeded" ||
    errorType === "rate_limit_error" ||
    errorMessage.includes("rate limit")
  ) {
    return {
      type: "rate_limit",
      provider,
      message: errorMessage,
      userFriendlyMessage:
        "The AI service is currently busy. Please try again in a moment.",
      isQuotaExceeded: true,
    };
  }

  // Insufficient quota / billing errors
  if (
    errorCode === "insufficient_quota" ||
    errorMessage.includes("insufficient_quota") ||
    errorMessage.includes("billing")
  ) {
    return {
      type: "insufficient_quota",
      provider,
      message: errorMessage,
      userFriendlyMessage:
        "The AI service quota has been exceeded. Please try again later.",
      isInsufficientBalance: true,
    };
  }

  // Authentication errors
  if (
    errorType === "authentication_error" ||
    errorCode === "invalid_api_key" ||
    errorMessage.includes("API key")
  ) {
    return {
      type: "auth_error",
      provider,
      message: errorMessage,
      userFriendlyMessage:
        "There was an authentication issue with the AI service. Please try again.",
      isAuthError: true,
    };
  }

  // Generic error fallback
  if (errorMessage) {
    return {
      type: errorType || "unknown_error",
      provider,
      message: errorMessage,
      userFriendlyMessage:
        "An error occurred while processing your request. Please try again.",
    };
  }

  return null;
}
