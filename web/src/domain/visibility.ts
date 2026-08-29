import { z } from "zod";

export const VisibilityReportSchema = z.object({
  benchmarkCount: z.number().int().nonnegative(),
  visibleBenchmarkCount: z.number().int().nonnegative(),
  visibilityRate: z.number().min(0).max(100),
  demandWeightedVisibility: z.number().min(0).max(100),
  averageCompetitorReadiness: z.number().min(0).max(100),
  readinessLead: z.number(),
  missedIntents: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

export type VisibilityReport = z.infer<typeof VisibilityReportSchema>;
