import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlaceholderId, validateInput } from "../message-utils";

// Mock the toast module
vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

// Mock the config module
vi.mock("@/lib/config", () => ({
  MESSAGE_MAX_LENGTH: 10_000,
}));

describe("message-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateInput", () => {
    it("should return false for empty message with no files", () => {
      const result = validateInput("", 0, "user-123");
      expect(result).toBe(false);
    });

    it("should return false for whitespace-only message with no files", () => {
      const result = validateInput("   ", 0, "user-123");
      expect(result).toBe(false);
    });

    it("should return true for valid message", () => {
      const result = validateInput("Hello world", 0, "user-123");
      expect(result).toBe(true);
    });

    it("should return true for empty message with files", () => {
      const result = validateInput("", 1, "user-123");
      expect(result).toBe(true);
    });

    it("should return true for whitespace message with files", () => {
      const result = validateInput("   ", 2, "user-123");
      expect(result).toBe(true);
    });

    it("should return false when userId is undefined", async () => {
      const { toast } = await import("@/components/ui/toast");
      const result = validateInput("Hello", 0, undefined);

      expect(result).toBe(false);
      expect(toast).toHaveBeenCalledWith({
        title: "User not found. Please try again.",
        status: "error",
      });
    });

    it("should return false when userId is empty string", async () => {
      const { toast } = await import("@/components/ui/toast");
      const result = validateInput("Hello", 0, "");

      expect(result).toBe(false);
      expect(toast).toHaveBeenCalled();
    });

    it("should return false when message exceeds max length", async () => {
      const { toast } = await import("@/components/ui/toast");
      const longMessage = "a".repeat(10_001);
      const result = validateInput(longMessage, 0, "user-123");

      expect(result).toBe(false);
      expect(toast).toHaveBeenCalledWith({
        title: "Message is too long (max 10000 chars).",
        status: "error",
      });
    });

    it("should return true when message is exactly at max length", () => {
      const exactMessage = "a".repeat(10_000);
      const result = validateInput(exactMessage, 0, "user-123");

      expect(result).toBe(true);
    });

    it("should handle message with special characters", () => {
      const result = validateInput("Hello 👋 world! @#$%^&*()", 0, "user-123");
      expect(result).toBe(true);
    });

    it("should handle message with newlines", () => {
      const result = validateInput("Line 1\nLine 2\nLine 3", 0, "user-123");
      expect(result).toBe(true);
    });

    it("should treat zero files count as no files", () => {
      const result = validateInput("", 0, "user-123");
      expect(result).toBe(false);
    });

    it("should accept multiple files", () => {
      const result = validateInput("", 5, "user-123");
      expect(result).toBe(true);
    });
  });

  describe("createPlaceholderId", () => {
    it("should create ID with placeholder prefix", () => {
      const id = createPlaceholderId();
      expect(id.startsWith("placeholder-")).toBe(true);
    });

    it("should include timestamp in ID", () => {
      const before = Date.now();
      const id = createPlaceholderId();
      const after = Date.now();

      const timestamp = Number.parseInt(id.replace("placeholder-", ""), 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("should create IDs with consistent format", () => {
      const id1 = createPlaceholderId();
      const id2 = createPlaceholderId();

      // Both should have the placeholder prefix
      expect(id1.startsWith("placeholder-")).toBe(true);
      expect(id2.startsWith("placeholder-")).toBe(true);

      // Both should have numeric timestamps
      const timestamp1 = id1.replace("placeholder-", "");
      const timestamp2 = id2.replace("placeholder-", "");
      expect(Number.isNaN(Number.parseInt(timestamp1, 10))).toBe(false);
      expect(Number.isNaN(Number.parseInt(timestamp2, 10))).toBe(false);
    });

    it("should be a valid string", () => {
      const id = createPlaceholderId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(12); // "placeholder-" + timestamp
    });
  });
});
