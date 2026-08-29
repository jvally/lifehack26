import { z } from "zod";

export const EvidenceStatusSchema = z.enum([
  "verified",
  "seller_declared",
  "ai_inferred",
  "missing",
]);

export const FeatureScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const FeatureValueSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: FeatureScalarSchema.nullable(),
  unit: z.string().nullable(),
  status: EvidenceStatusSchema,
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()),
});

export const ProductPassportSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  features: z.array(FeatureValueSchema),
  useCases: z.array(z.string()),
  suitableContexts: z.array(z.string()),
  limitations: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type FeatureValue = z.infer<typeof FeatureValueSchema>;
export type ProductPassport = z.infer<typeof ProductPassportSchema>;
