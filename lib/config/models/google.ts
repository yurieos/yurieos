import {
  FILE_UPLOAD_FEATURE,
  REASONING_FEATURE,
  TOOL_CALLING_FEATURE,
} from "../features";

export const GOOGLE_MODELS = [
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    shortName: "Gemini 3",
    provider: "gateway",
    displayProvider: "google",
    premium: false,
    description:
      "Google's fastest model with pro-grade reasoning.\nOptimized for speed and efficiency with low latency.",
    apiMode: "chat" as const,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [FILE_UPLOAD_FEATURE, REASONING_FEATURE, TOOL_CALLING_FEATURE],
  },
];
