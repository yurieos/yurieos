/**
 * Model Utilities
 * Helper functions for model validation, feature detection, and configuration
 */

import { MODELS } from "@/lib/config";

/**
 * Checks if a model supports configurable reasoning effort
 */
export function supportsReasoningEffort(modelId: string): boolean {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model?.features) {
    return false;
  }
  const reasoningFeature = model.features.find((f) => f.id === "reasoning");
  return (
    reasoningFeature?.enabled === true &&
    reasoningFeature?.supportsEffort === true
  );
}
