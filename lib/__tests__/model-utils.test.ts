import { describe, expect, it, vi } from "vitest";
import { supportsReasoningEffort } from "../model-utils";

// Mock the MODELS config
vi.mock("@/lib/config", () => ({
  MODELS: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      features: [
        { id: "tool-calling", enabled: true },
        { id: "reasoning", enabled: false },
      ],
    },
    {
      id: "o1-preview",
      name: "O1 Preview",
      features: [
        { id: "reasoning", enabled: true, supportsEffort: true },
        { id: "tool-calling", enabled: false },
      ],
    },
    {
      id: "o1-mini",
      name: "O1 Mini",
      features: [{ id: "reasoning", enabled: true, supportsEffort: false }],
    },
    {
      id: "claude-3-opus",
      name: "Claude 3 Opus",
      features: [{ id: "tool-calling", enabled: true }],
    },
    {
      id: "no-features",
      name: "No Features Model",
      // No features array
    },
    {
      id: "empty-features",
      name: "Empty Features",
      features: [],
    },
  ],
}));

describe("model-utils", () => {
  describe("supportsReasoningEffort", () => {
    it("should return true for model with reasoning enabled and supportsEffort true", () => {
      const result = supportsReasoningEffort("o1-preview");
      expect(result).toBe(true);
    });

    it("should return false for model with reasoning enabled but supportsEffort false", () => {
      const result = supportsReasoningEffort("o1-mini");
      expect(result).toBe(false);
    });

    it("should return false for model with reasoning disabled", () => {
      const result = supportsReasoningEffort("gpt-4o");
      expect(result).toBe(false);
    });

    it("should return false for model without reasoning feature", () => {
      const result = supportsReasoningEffort("claude-3-opus");
      expect(result).toBe(false);
    });

    it("should return false for model without features array", () => {
      const result = supportsReasoningEffort("no-features");
      expect(result).toBe(false);
    });

    it("should return false for model with empty features array", () => {
      const result = supportsReasoningEffort("empty-features");
      expect(result).toBe(false);
    });

    it("should return false for non-existent model", () => {
      const result = supportsReasoningEffort("non-existent-model");
      expect(result).toBe(false);
    });

    it("should return false for empty string model ID", () => {
      const result = supportsReasoningEffort("");
      expect(result).toBe(false);
    });
  });
});
