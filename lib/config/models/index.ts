import { z } from "zod";
import { ModelSchema } from "../schemas";
import { ANTHROPIC_MODELS } from "./anthropic";
import { GOOGLE_MODELS } from "./google";
import { OPENAI_MODELS } from "./openai";

// Combine all models from different providers
const MODELS_DATA = [...OPENAI_MODELS, ...GOOGLE_MODELS, ...ANTHROPIC_MODELS];

const MODELS_RAW = z.array(ModelSchema).parse(MODELS_DATA);

export const MODELS = MODELS_RAW;

// Add a map for O(1) lookup by id
export const MODELS_MAP: Record<string, (typeof MODELS)[number]> =
  Object.fromEntries(MODELS.map((model) => [model.id, model]));
