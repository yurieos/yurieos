export const APP_NAME = "Yurie";
export const APP_DESCRIPTION =
  "Yurie is your AI personal assistant. Features multi-modal support, reasoning models, and web search in one powerful interface.";
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const MODEL_DEFAULT = "google/gemini-3-flash";

export const MESSAGE_MAX_LENGTH = 1_000_000;

export const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

// Default to "none" so reasoning is opt-in.
export const REASONING_EFFORT_DEFAULT: ReasoningEffort = "none";
