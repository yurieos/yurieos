import {
  FILE_UPLOAD_FEATURE,
  PDF_PROCESSING_FEATURE,
  REASONING_FEATURE,
  TOOL_CALLING_FEATURE,
} from "../features";

export const OPENAI_MODELS = [
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    shortName: "GPT-5.2",
    provider: "gateway",
    displayProvider: "openai",
    premium: true,
    description:
      "OpenAI's latest flagship model.\nA drop-in replacement for GPT-5.1 with stronger reasoning and coding performance.",
    apiMode: "chat" as const,
    apiKeyUsage: { allowUserKey: false, userKeyOnly: false },
    features: [
      FILE_UPLOAD_FEATURE,
      PDF_PROCESSING_FEATURE,
      REASONING_FEATURE,
      TOOL_CALLING_FEATURE,
    ],
  },
];
