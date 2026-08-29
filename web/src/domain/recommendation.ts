import { z } from "zod";
import { QueryIntentSchema } from "./market";

export const RecommendationCandidateSchema = z.object({
  productId: z.string(),
  productName: z.string().min(1),
  eligible: z.boolean(),
  rank: z.number().int().positive().nullable(),
  fitScore: z.number().min(0).max(100),
  matchedFacts: z.array(z.string()),
  failedConstraints: z.array(z.string()),
  missingEvidence: z.array(z.string()),
});

export const RecommendationResultSchema = z.object({
  query: z.string().min(1),
  intent: QueryIntentSchema,
  candidates: z.array(RecommendationCandidateSchema),
  scoringVersion: z.literal("1.0.0"),
});

export type RecommendationCandidate = z.infer<
  typeof RecommendationCandidateSchema
>;
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;
