import { z } from "zod";

const ModelFeatureSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  label: z.string().optional(),
  supportsEffort: z.boolean().optional(),
});

const ApiKeyUsageSchema = z.object({
  allowUserKey: z.boolean(),
  userKeyOnly: z.boolean(),
});

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  subName: z.string().optional(),
  provider: z.string(), // Main provider for API routing and parameter configuration
  displayProvider: z.string().optional(), // Optional provider name for UI display/icons only
  apiMode: z.enum(["chat", "responses"]).optional(),
  api_sdk: z.any().optional(),
  premium: z.boolean(),
  description: z.string(),
  features: z.array(ModelFeatureSchema).default([]),
  apiKeyUsage: ApiKeyUsageSchema.default({
    allowUserKey: false,
    userKeyOnly: false,
  }),
});
