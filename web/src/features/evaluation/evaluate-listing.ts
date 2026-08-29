import type { ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { buildGaps } from "./build-gaps";
import { scoreCompetitiveness } from "./competitiveness";
import { scoreReadiness } from "./readiness";

export function evaluateListing(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
  now: Date = new Date(),
): ListingEvaluation {
  const readinessResult = scoreReadiness(passport, intelligence);
  const { coveredIntentIds, ...readiness } = readinessResult;

  return {
    readiness,
    competitiveness: scoreCompetitiveness(
      passport,
      intelligence,
      readiness.intentCoverage,
    ),
    gaps: buildGaps(passport, intelligence),
    coveredIntentIds,
    generatedAt: now.toISOString(),
    scoringVersion: "1.0.0",
  };
}