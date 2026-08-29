import type { ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { VisibilityReport } from "@/domain/visibility";

export function buildVisibilityReport(
  evaluation: ListingEvaluation,
  intelligence: CategoryIntelligence,
  competitorReadiness: number[],
  now: Date = new Date(),
): VisibilityReport {
  const visible = new Set(evaluation.coveredIntentIds);
  const totalWeight = intelligence.intents.reduce((sum, intent) => sum + intent.weight, 0) || 1;
  const visibleWeight = intelligence.intents
    .filter((intent) => visible.has(intent.id))
    .reduce((sum, intent) => sum + intent.weight, 0);
  const averageCompetitorReadiness = competitorReadiness.length
    ? competitorReadiness.reduce((sum, score) => sum + score, 0) / competitorReadiness.length
    : 0;
  return {
    benchmarkCount: intelligence.intents.length,
    visibleBenchmarkCount: visible.size,
    visibilityRate: intelligence.intents.length ? Math.round((visible.size / intelligence.intents.length) * 100) : 0,
    demandWeightedVisibility: Math.round((visibleWeight / totalWeight) * 100),
    averageCompetitorReadiness: Math.round(averageCompetitorReadiness),
    readinessLead: Math.round(evaluation.readiness.total - averageCompetitorReadiness),
    missedIntents: intelligence.intents.filter((intent) => !visible.has(intent.id)).map((intent) => intent.label),
    generatedAt: now.toISOString(),
  };
}
