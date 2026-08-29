import type { ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence, FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { RecommendationResult } from "@/domain/recommendation";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";

export type DashboardData = {
  passport: ProductPassport;
  intelligence: CategoryIntelligence;
  evaluation: ListingEvaluation;
  sessionId: string | null;
};

export const runningShoeFeatures: FeatureDefinition[] = [
  { key: "weight", label: "Measured weight", dataType: "number", unit: "g", required: true, demandWeight: 0.9, constraintImportance: 0.9, competitiveCoverage: 0.85, competitiveDirection: "lower", answerability: 1, evidenceRequired: true, synonyms: ["lightweight", "grams"] },
  { key: "terrain", label: "Terrain", dataType: "string", unit: null, required: true, demandWeight: 0.85, constraintImportance: 0.85, competitiveCoverage: 0.9, competitiveDirection: "neutral", answerability: 1, evidenceRequired: false, synonyms: ["road", "trail"] },
  { key: "breathability", label: "Breathability", dataType: "string", unit: null, required: false, demandWeight: 0.8, constraintImportance: 0.7, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: true, synonyms: ["ventilated", "airflow"] },
  { key: "weather_suitability", label: "Weather suitability", dataType: "string", unit: null, required: false, demandWeight: 0.7, constraintImportance: 0.7, competitiveCoverage: 0.65, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["humid", "rain"] },
  { key: "distance_suitability", label: "Distance suitability", dataType: "string", unit: null, required: false, demandWeight: 0.75, constraintImportance: 0.7, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["half marathon", "long run"] },
];

export function makeMockDashboard(productId: string): DashboardData {
  const passport: ProductPassport = {
      productId,
      name: "CloudRun Pro",
      category: "running_shoes",
      description: "A lightweight and comfortable running shoe suitable for all runners. Made with premium materials.",
      price: 179,
      currency: "SGD",
      features: runningShoeFeatures.map((feature) => ({ key: feature.key, label: feature.label, value: null, unit: feature.unit, status: "missing", confidence: 0, evidenceIds: [] })),
      useCases: ["Everyday running"], suitableContexts: [], limitations: [], updatedAt: "2026-08-29T00:00:00.000Z",
    };
  const intelligence: CategoryIntelligence = {
      category: "running_shoes", features: runningShoeFeatures,
      intents: [{ id: "humid-half-marathon", label: "Humid-weather half-marathon training", weight: 38, requiredFeatures: ["weight", "terrain"], preferredFeatures: ["breathability", "weather_suitability", "distance_suitability"] }],
      peerMedians: { weight: 245 }, peerPriceMedian: 189,
    };
  return {
    passport,
    intelligence,
    evaluation: evaluateListing(
      passport,
      intelligence,
      new Date("2026-08-29T00:00:00.000Z"),
    ),
    sessionId: null,
  };
}

export function makeMockRecommendation(query: string, improved: boolean): RecommendationResult {
  return {
    query,
    intent: { category: "running_shoes", goal: "Half-marathon training", hardConstraints: { price: 200, terrain: "road" }, preferences: ["lightweight", "breathable"], contexts: ["humid weather"] },
    candidates: [{ productId: "cloudrun-pro", eligible: improved, rank: improved ? 2 : null, fitScore: improved ? 82 : 24, matchedFacts: improved ? ["Road terrain", "220 g weight", "S$179 price"] : ["S$179 price"], failedConstraints: improved ? [] : ["Road terrain is unknown"], missingEvidence: improved ? [] : ["Measured weight", "Humid-weather suitability"] }],
    scoringVersion: "1.0.0",
  };
}
