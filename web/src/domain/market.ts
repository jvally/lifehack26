import { z } from "zod";

export const ConstraintValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const QueryIntentSchema = z.object({
  category: z.string().min(1),
  goal: z.string().nullable(),
  hardConstraints: z.record(z.string(), ConstraintValueSchema),
  preferences: z.array(z.string()),
  contexts: z.array(z.string()),
});

export const FeatureDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  dataType: z.enum(["string", "number", "boolean", "string_array"]),
  unit: z.string().nullable(),
  required: z.boolean(),
  demandWeight: z.number().min(0).max(1),
  constraintImportance: z.number().min(0).max(1),
  competitiveCoverage: z.number().min(0).max(1),
  competitiveDirection: z.enum(["lower", "higher", "neutral"]),
  answerability: z.number().min(0).max(1),
  evidenceRequired: z.boolean(),
  synonyms: z.array(z.string()),
});

export const BenchmarkIntentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().positive(),
  requiredFeatures: z.array(z.string()),
  preferredFeatures: z.array(z.string()),
});

export const CategoryIntelligenceSchema = z.object({
  category: z.string().min(1),
  features: z.array(FeatureDefinitionSchema),
  intents: z.array(BenchmarkIntentSchema),
  peerMedians: z.record(z.string(), z.number()),
  peerPriceMedian: z.number().nonnegative().nullable(),
});

export const MarketSignalSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  signalType: z.enum(["user_query", "competitor_observation"]),
  rawText: z.string().min(1),
  parsedIntent: QueryIntentSchema.nullable(),
  featureKeys: z.array(z.string()),
  featureValues: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  frequency: z.number().nonnegative(),
  sourceLabel: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  observedAt: z.string().datetime(),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
export type BenchmarkIntent = z.infer<typeof BenchmarkIntentSchema>;
export type CategoryIntelligence = z.infer<typeof CategoryIntelligenceSchema>;
export type MarketSignal = z.infer<typeof MarketSignalSchema>;
