import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../error-codes";
import { createErrorResponse, createStreamingError } from "../error-utils";

describe("error-utils", () => {
  describe("createErrorResponse", () => {
    it("should create an error response for generic Error", () => {
      const error = new Error("An unexpected issue occurred");
      const response = createErrorResponse(error);

      // Generic errors return a response with an error payload
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should create an error response for unknown error types", () => {
      const error = "string error message here";
      const response = createErrorResponse(error);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should create response with proper error payload structure", async () => {
      const error = new Error("Test issue");
      const response = createErrorResponse(error);
      const body = (await response.json()) as {
        error: { type: string; message: string; code: string };
      };

      expect(body.error).toBeDefined();
      expect(body.error.type).toBeDefined();
      expect(body.error.message).toBeDefined();
      expect(body.error.code).toBeDefined();
    });

    it("should handle null error gracefully", () => {
      const response = createErrorResponse(null);
      expect(response.status).toBe(500);
    });

    it("should handle undefined error gracefully", () => {
      const response = createErrorResponse(undefined);
      expect(response.status).toBe(500);
    });

    it("should handle object with message property", async () => {
      const error = { message: "Custom message here" };
      const response = createErrorResponse(error);
      const body = (await response.json()) as {
        error: { message: string };
      };

      // Provider error detector may classify this differently
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(body.error.message).toBeDefined();
    });
  });

  describe("createStreamingError", () => {
    it("should return shouldSaveToConversation true for generic errors", () => {
      const error = new Error("Something went wrong");
      const result = createStreamingError(error);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should return proper error payload structure", () => {
      const error = new Error("Test streaming error");
      const result = createStreamingError(error);

      expect(result.errorPayload).toBeDefined();
      expect(result.errorPayload.error).toBeDefined();
      expect(result.errorPayload.error.type).toBeDefined();
      expect(result.errorPayload.error.message).toBeDefined();
    });

    it("should handle content policy violation errors", () => {
      const error = new Error(
        "limited access to this content for safety reasons"
      );
      const result = createStreamingError(error);

      expect(result.shouldSaveToConversation).toBe(true);
      expect(result.errorPayload.error.type).toBe("content_policy_violation");
    });

    it("should handle rate limit errors", () => {
      const error = {
        type: "error",
        error: {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        },
      };
      const result = createStreamingError(error);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should handle authentication errors", () => {
      const error = {
        type: "error",
        error: {
          type: "authentication_error",
          message: "Invalid API key",
        },
      };
      const result = createStreamingError(error);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should handle quota exceeded errors", () => {
      const error = {
        type: "error",
        error: {
          code: "insufficient_quota",
          message: "You have exceeded your quota",
        },
      };
      const result = createStreamingError(error);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should handle null gracefully", () => {
      const result = createStreamingError(null);

      expect(result.shouldSaveToConversation).toBe(true);
      expect(result.errorPayload.error.message).toBeDefined();
    });

    it("should handle undefined gracefully", () => {
      const result = createStreamingError(undefined);

      expect(result.shouldSaveToConversation).toBe(true);
      expect(result.errorPayload.error.message).toBeDefined();
    });
  });

  describe("error code mapping", () => {
    it("should have all expected error codes defined", () => {
      expect(ERROR_CODES.NOT_AUTHENTICATED).toBe("NOT_AUTHENTICATED");
      expect(ERROR_CODES.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED");
      expect(ERROR_CODES.INVALID_INPUT).toBe("INVALID_INPUT");
      expect(ERROR_CODES.USER_NOT_FOUND).toBe("USER_NOT_FOUND");
      expect(ERROR_CODES.CHAT_NOT_FOUND).toBe("CHAT_NOT_FOUND");
      expect(ERROR_CODES.PROVIDER_STREAM_QUOTA_EXCEEDED).toBe(
        "PROVIDER_STREAM_QUOTA_EXCEEDED"
      );
      expect(ERROR_CODES.PROVIDER_CONTENT_POLICY_VIOLATION).toBe(
        "PROVIDER_CONTENT_POLICY_VIOLATION"
      );
    });
  });

  describe("detected error handling", () => {
    it("should handle DetectedError objects", () => {
      const detectedError = {
        type: "content_policy_violation",
        provider: "openai",
        message: "Content blocked",
        userFriendlyMessage: "Your message was blocked",
        isContentPolicyViolation: true,
      };

      const result = createStreamingError(detectedError);

      expect(result.shouldSaveToConversation).toBe(true);
      expect(result.errorPayload.error.type).toBe("content_policy_violation");
    });

    it("should handle DetectedError with quota exceeded", () => {
      const detectedError = {
        type: "rate_limit",
        provider: "openai",
        message: "Quota exceeded",
        userFriendlyMessage: "Service is busy",
        isQuotaExceeded: true,
      };

      const result = createStreamingError(detectedError);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should handle DetectedError with auth error", () => {
      const detectedError = {
        type: "auth_error",
        provider: "openai",
        message: "Invalid API key",
        userFriendlyMessage: "Authentication failed",
        isAuthError: true,
      };

      const result = createStreamingError(detectedError);

      expect(result.shouldSaveToConversation).toBe(true);
    });

    it("should handle DetectedError with insufficient balance", () => {
      const detectedError = {
        type: "insufficient_quota",
        provider: "openai",
        message: "Insufficient balance",
        userFriendlyMessage: "Account balance too low",
        isInsufficientBalance: true,
      };

      const result = createStreamingError(detectedError);

      expect(result.shouldSaveToConversation).toBe(true);
    });
  });
});
