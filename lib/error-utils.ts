/**
 * Error classification and handling utilities
 */

import { ERROR_CODES } from "./error-codes";
import {
  detectProviderError,
  type DetectedError,
} from "./provider-error-detector";

type ErrorDisplayType = "conversation" | "toast" | "both";

/**
 * Type guard to check if an error is a DetectedError from provider error detection
 */
function isDetectedError(error: unknown): error is DetectedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "provider" in error &&
    "message" in error &&
    "userFriendlyMessage" in error
  );
}

type ClassifiedError = {
  displayType: ErrorDisplayType;
  code: string;
  message: string;
  userFriendlyMessage: string;
  httpStatus: number;
  responseType: string;
  originalError?: Error | unknown;
};

/**
 * HTTP status code mapping for different error types
 */
function getHttpStatusForErrorCode(code: string): number {
  switch (code) {
    case ERROR_CODES.NOT_AUTHENTICATED:
    case ERROR_CODES.TOKEN_EXPIRED:
      return 401;
    case ERROR_CODES.UNAUTHORIZED:
    case ERROR_CODES.PREMIUM_MODEL_ACCESS_DENIED:
      return 403;
    case ERROR_CODES.INVALID_INPUT:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
    case ERROR_CODES.UNSUPPORTED_FILE_TYPE:
    case ERROR_CODES.FILE_TOO_LARGE:
    case ERROR_CODES.PROVIDER_CONTENT_POLICY_VIOLATION:
      return 400;
    case ERROR_CODES.USER_NOT_FOUND:
    case ERROR_CODES.CHAT_NOT_FOUND:
    case ERROR_CODES.MESSAGE_NOT_FOUND:
    case ERROR_CODES.FILE_NOT_FOUND:
      return 404;
    case ERROR_CODES.PROVIDER_STREAM_THROTTLED:
    case ERROR_CODES.PROVIDER_STREAM_RESOURCE_EXHAUSTED:
      return 429;
    case ERROR_CODES.PROVIDER_STREAM_QUOTA_EXCEEDED:
    case ERROR_CODES.PROVIDER_STREAM_INSUFFICIENT_BALANCE:
      return 402;
    case ERROR_CODES.PROVIDER_STREAM_AUTH_ERROR:
      return 401;
    case ERROR_CODES.PROVIDER_STREAM_TIMEOUT:
      return 408;
    default:
      return 500;
  }
}

/**
 * Get API response type identifier for error code
 */
function getResponseTypeForErrorCode(code: string): string {
  switch (code) {
    case ERROR_CODES.NOT_AUTHENTICATED:
      return "auth_error";
    case ERROR_CODES.UNAUTHORIZED:
      return "unauthorized";
    case ERROR_CODES.PREMIUM_MODEL_ACCESS_DENIED:
      return "premium_access_denied";
    case ERROR_CODES.INVALID_INPUT:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
      return "validation_error";
    case ERROR_CODES.PROVIDER_STREAM_QUOTA_EXCEEDED:
      return "provider_quota_exceeded";
    case ERROR_CODES.PROVIDER_STREAM_AUTH_ERROR:
      return "provider_auth_error";
    case ERROR_CODES.PROVIDER_CONTENT_POLICY_VIOLATION:
      return "content_policy_violation";
    default:
      return "unknown_error";
  }
}

/**
 * Classify an error and determine how it should be displayed
 */
function classifyError(error: unknown): ClassifiedError {
  // Handle DetectedError from provider error detection first
  if (isDetectedError(error)) {
    return classifyStreamingError(error);
  }

  // Try to detect provider-specific errors from the error object/message
  const detectedError = detectProviderError(error);
  if (detectedError) {
    return classifyStreamingError(detectedError);
  }

  // Handle any Error instances or unknown errors
  let errorMsg: string;
  if (error && error instanceof Error) {
    errorMsg = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    errorMsg = String((error as { message: unknown }).message);
  } else {
    errorMsg = String(error);
  }

  // Default: treat as system error
  return {
    displayType: "conversation",
    code: "SYSTEM_ERROR",
    message: errorMsg,
    userFriendlyMessage: "An unexpected error occurred. Please try again.",
    httpStatus: 500,
    responseType: "unknown_error",
    originalError: error,
  };
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(error: unknown): Response {
  const classified = classifyError(error);

  const errorPayload = {
    error: {
      type: classified.responseType,
      message: classified.userFriendlyMessage,
      code: classified.code,
    },
  };

  return new Response(JSON.stringify(errorPayload), {
    status: classified.httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a standardized streaming error for conversation display
 */
export function createStreamingError(error: unknown): {
  shouldSaveToConversation: boolean;
  errorPayload: {
    error: {
      type: string;
      message: string;
    };
  };
} {
  const classified = classifyError(error);

  const errorPayload = {
    error: {
      type: classified.responseType,
      message: classified.userFriendlyMessage,
    },
  };

  return {
    shouldSaveToConversation:
      classified.displayType === "conversation" ||
      classified.displayType === "both",
    errorPayload,
  };
}

/**
 * Create a classified error from a detected streaming error
 */
function classifyStreamingError(detectedError: {
  type: string;
  provider: string;
  message: string;
  userFriendlyMessage: string;
  isQuotaExceeded?: boolean;
  isInsufficientBalance?: boolean;
  isAuthError?: boolean;
  isContentPolicyViolation?: boolean;
}): ClassifiedError {
  let code: string;
  if (detectedError.isContentPolicyViolation) {
    code = ERROR_CODES.PROVIDER_CONTENT_POLICY_VIOLATION;
  } else if (detectedError.isQuotaExceeded) {
    code = ERROR_CODES.PROVIDER_STREAM_QUOTA_EXCEEDED;
  } else if (detectedError.isInsufficientBalance) {
    code = ERROR_CODES.PROVIDER_STREAM_INSUFFICIENT_BALANCE;
  } else if (detectedError.isAuthError) {
    code = ERROR_CODES.PROVIDER_STREAM_AUTH_ERROR;
  } else {
    code = ERROR_CODES.PROVIDER_STREAM_THROTTLED;
  }

  return {
    displayType: "conversation",
    code,
    message: detectedError.message,
    userFriendlyMessage: detectedError.userFriendlyMessage,
    httpStatus: getHttpStatusForErrorCode(code),
    responseType: getResponseTypeForErrorCode(code),
    originalError: detectedError,
  };
}
