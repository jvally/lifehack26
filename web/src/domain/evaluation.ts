import { z } from "zod";

export const ScoreBreakdownSchema = z.object({
  completeness: z.number().min(0).max(100),
  intentCoverage: z.number().min(0).max(100),
  evidenceQuality: z.number().min(0).max(100),
  discoverability: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

export const CompetitivenessBreakdownSchema = z.object({
  peerFeatureCoverage: z.number().min(0).max(100),
  differentiation: z.number().min(0).max(100),
  relativeSpecifications: z.number().min(0).max(100),
  priceFit: z.number().min(0).max(100),
  highDemandQueryCoverage: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

export const GapSchema = z.object({
  featureKey: z.string().min(1),
  label: z.string().min(1),
  reason: z.enum([
    "missing",
    "low_confidence",
    "evidence_required",
    "competitive_gap",
  ]),
  priority: z.number().min(0).max(100),
  question: z.string().min(1),
  evidenceRequested: z.boolean(),
});

export const ListingEvaluationSchema = z.object({
  readiness: ScoreBreakdownSchema,
  competitiveness: CompetitivenessBreakdownSchema,
  gaps: z.array(GapSchema),
  coveredIntentIds: z.array(z.string()),
  generatedAt: z.string().datetime(),
  scoringVersion: z.literal("1.0.0"),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type CompetitivenessBreakdown = z.infer<
  typeof CompetitivenessBreakdownSchema
>;
export type Gap = z.infer<typeof GapSchema>;
export type ListingEvaluation = z.infer<typeof ListingEvaluationSchema>;
