import {
  FILE_UPLOAD_FEATURE,
  REASONING_FEATURE,
  TOOL_CALLING_FEATURE,
} from "../features";

export const ANTHROPIC_MODELS = [
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    shortName: "Opus 4.5",
    provider: "gateway",
    displayProvider: "anthropic",
    premium: true,
    description:
      "Anthropic's most intelligent model.\nExcels at complex reasoning, advanced problem-solving, and nuanced understanding.",
    apiMode: "chat" as const,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [FILE_UPLOAD_FEATURE, REASONING_FEATURE, TOOL_CALLING_FEATURE],
  },
];
