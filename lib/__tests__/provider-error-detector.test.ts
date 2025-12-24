import { describe, expect, it } from "vitest";
import { detectProviderError } from "../provider-error-detector";

describe("provider-error-detector", () => {
  describe("detectProviderError", () => {
    describe("string error handling", () => {
      it("should parse JSON string errors", () => {
        const jsonError = JSON.stringify({
          type: "error",
          error: {
            type: "rate_limit_error",
            message: "Rate limit exceeded",
          },
        });

        const result = detectProviderError(jsonError);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("rate_limit");
        expect(result?.isQuotaExceeded).toBe(true);
      });

      it("should detect content policy violation in plain text", () => {
        const error = "limited access to this content for safety reasons";

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
        expect(result?.isContentPolicyViolation).toBe(true);
        expect(result?.provider).toBe("openai");
      });

      it("should detect invalid_prompt in plain text", () => {
        const error = "invalid_prompt: The prompt was rejected";

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
        expect(result?.isContentPolicyViolation).toBe(true);
      });

      it("should return null for non-error strings", () => {
        const result = detectProviderError("Just a regular message");

        expect(result).toBeNull();
      });

      it("should return null for invalid JSON strings", () => {
        const result = detectProviderError("{ invalid json }");

        expect(result).toBeNull();
      });
    });

    describe("Error object handling", () => {
      it("should detect content policy violation in Error message", () => {
        const error = new Error(
          "limited access to this content for safety reasons"
        );

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
        expect(result?.isContentPolicyViolation).toBe(true);
      });

      it("should detect invalid_prompt in Error message", () => {
        const error = new Error("invalid_prompt");

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
      });

      it("should detect Invalid prompt (capitalized) in Error message", () => {
        const error = new Error("Invalid prompt detected");

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
      });

      it("should parse JSON in Error message", () => {
        const jsonError = JSON.stringify({
          type: "error",
          error: {
            code: "rate_limit_exceeded",
            message: "Too many requests",
          },
        });
        const error = new Error(jsonError);

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("rate_limit");
      });

      it("should return null for generic Error without patterns", () => {
        const error = new Error("Generic error");

        const result = detectProviderError(error);

        // Generic errors return a fallback result with the message
        expect(result).not.toBeNull();
        expect(result?.type).toBe("unknown_error");
      });
    });

    describe("plain object handling", () => {
      it("should detect OpenAI-style error structure", () => {
        const error = {
          type: "error",
          error: {
            type: "rate_limit_error",
            message: "You are sending requests too quickly",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("rate_limit");
        expect(result?.isQuotaExceeded).toBe(true);
      });

      it("should detect rate_limit_exceeded code", () => {
        const error = {
          type: "error",
          error: {
            code: "rate_limit_exceeded",
            message: "Rate limit exceeded",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("rate_limit");
      });

      it("should detect insufficient_quota code", () => {
        const error = {
          type: "error",
          error: {
            code: "insufficient_quota",
            message: "You exceeded your current quota",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("insufficient_quota");
        expect(result?.isInsufficientBalance).toBe(true);
      });

      it("should detect billing errors", () => {
        const error = {
          type: "error",
          error: {
            message: "Please check your billing settings",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("insufficient_quota");
        expect(result?.isInsufficientBalance).toBe(true);
      });

      it("should detect authentication_error type", () => {
        const error = {
          type: "error",
          error: {
            type: "authentication_error",
            message: "Invalid authentication",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("auth_error");
        expect(result?.isAuthError).toBe(true);
      });

      it("should detect invalid_api_key code", () => {
        const error = {
          type: "error",
          error: {
            code: "invalid_api_key",
            message: "Incorrect API key provided",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("auth_error");
        expect(result?.isAuthError).toBe(true);
      });

      it("should detect API key mentioned in message", () => {
        const error = {
          type: "error",
          error: {
            message: "Your API key is invalid",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("auth_error");
      });

      it("should detect invalid_prompt code", () => {
        const error = {
          type: "error",
          error: {
            code: "invalid_prompt",
            message: "The prompt was rejected",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
        expect(result?.isContentPolicyViolation).toBe(true);
      });

      it("should detect content policy in invalid_request_error", () => {
        const error = {
          type: "error",
          error: {
            type: "invalid_request_error",
            message:
              "You have limited access to this content for safety reasons",
          },
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("content_policy_violation");
      });

      it("should handle direct error object without wrapper", () => {
        const error = {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        };

        const result = detectProviderError(error);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("rate_limit");
      });

      it("should return null for empty object", () => {
        const result = detectProviderError({});

        expect(result).toBeNull();
      });

      it("should return null for null", () => {
        const result = detectProviderError(null);

        expect(result).toBeNull();
      });

      it("should return null for undefined", () => {
        const result = detectProviderError(undefined);

        expect(result).toBeNull();
      });
    });

    describe("user-friendly messages", () => {
      it("should provide user-friendly message for rate limits", () => {
        const error = {
          type: "error",
          error: {
            type: "rate_limit_error",
            message: "Technical rate limit message",
          },
        };

        const result = detectProviderError(error);

        expect(result?.userFriendlyMessage).toContain("busy");
      });

      it("should provide user-friendly message for quota exceeded", () => {
        const error = {
          type: "error",
          error: {
            code: "insufficient_quota",
            message: "Technical quota message",
          },
        };

        const result = detectProviderError(error);

        expect(result?.userFriendlyMessage).toContain("quota");
      });

      it("should provide user-friendly message for auth errors", () => {
        const error = {
          type: "error",
          error: {
            type: "authentication_error",
            message: "Technical auth message",
          },
        };

        const result = detectProviderError(error);

        expect(result?.userFriendlyMessage).toContain("authentication");
      });

      it("should provide user-friendly message for content policy", () => {
        const error = "limited access to this content for safety reasons";

        const result = detectProviderError(error);

        expect(result?.userFriendlyMessage).toContain("content policy");
      });
    });

    describe("provider detection", () => {
      it("should set provider to openai for content policy errors", () => {
        const error = "limited access to this content for safety reasons";

        const result = detectProviderError(error);

        expect(result?.provider).toBe("openai");
      });

      it("should set provider to unknown for direct error objects", () => {
        const error = {
          type: "rate_limit_error",
          message: "Rate limit exceeded",
        };

        const result = detectProviderError(error);

        expect(result?.provider).toBe("unknown");
      });

      it("should set provider to openai for wrapped errors", () => {
        const error = {
          type: "error",
          error: {
            type: "rate_limit_error",
            message: "Rate limit exceeded",
          },
        };

        const result = detectProviderError(error);

        expect(result?.provider).toBe("openai");
      });
    });
  });
});
