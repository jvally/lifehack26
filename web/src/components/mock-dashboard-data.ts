import type { ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence, FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { RecommendationResult } from "@/domain/recommendation";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { preserveExplicitListingFacts } from "@/features/extraction/explicit-listing-facts";

export type DashboardData = {
  passport: ProductPassport;
  intelligence: CategoryIntelligence;
  evaluation: ListingEvaluation;
  sessionId: string | null;
};

export const runningShoeFeatures: FeatureDefinition[] = [
  { key: "weight", label: "Measured weight", dataType: "number", unit: "g", required: true, demandWeight: 0.9, constraintImportance: 0.9, competitiveCoverage: 0.85, competitiveDirection: "lower", answerability: 1, evidenceRequired: true, synonyms: ["lightweight", "grams"] },
  { key: "terrain", label: "Running terrain", dataType: "string", unit: null, required: true, demandWeight: 0.85, constraintImportance: 0.85, competitiveCoverage: 0.9, competitiveDirection: "neutral", answerability: 1, evidenceRequired: false, synonyms: ["road", "trail"] },
  { key: "cushioning", label: "Cushioning", dataType: "string", unit: null, required: false, demandWeight: 0.75, constraintImportance: 0.6, competitiveCoverage: 0.8, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["soft", "firm", "plush", "responsive"] },
  { key: "breathability", label: "Breathability", dataType: "string", unit: null, required: false, demandWeight: 0.8, constraintImportance: 0.7, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: true, synonyms: ["ventilated", "airflow"] },
  { key: "weather_suitability", label: "Weather suitability", dataType: "string", unit: null, required: false, demandWeight: 0.7, constraintImportance: 0.7, competitiveCoverage: 0.65, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["humid", "rain"] },
  { key: "distance_suitability", label: "Distance suitability", dataType: "string", unit: null, required: false, demandWeight: 0.75, constraintImportance: 0.7, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["half marathon", "long run"] },
  { key: "stability", label: "Stability type", dataType: "string", unit: null, required: false, demandWeight: 0.8, constraintImportance: 0.9, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: true, synonyms: ["stability", "neutral", "motion control"] },
  { key: "durability", label: "Durability", dataType: "string", unit: null, required: false, demandWeight: 0.6, constraintImportance: 0.6, competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9, evidenceRequired: false, synonyms: ["durability", "durable", "abrasion resistant"] },
];

export function makeMockDashboard(productId: string, sourceListing?: string): DashboardData {
  const listingLines = sourceListing
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
  const priceMatch = sourceListing?.match(/(?:S\$|SGD\s*)(\d+(?:\.\d{1,2})?)/i);
  const basePassport: ProductPassport = {
      productId,
      name: listingLines[0] ?? "CloudRun Pro",
      category: "running_shoes",
      description: listingLines.slice(1).join(" ") || "A lightweight and comfortable running shoe suitable for all runners. Made with premium materials.",
      price: priceMatch ? Number(priceMatch[1]) : 179,
      currency: priceMatch ? "SGD" : "SGD",
      features: runningShoeFeatures.map((feature) => ({ key: feature.key, label: feature.label, value: null, unit: feature.unit, status: "missing", confidence: 0, evidenceIds: [] })),
      useCases: ["Everyday running"], suitableContexts: [], limitations: [], updatedAt: "2026-08-29T00:00:00.000Z",
    };
  const passport = sourceListing
    ? preserveExplicitListingFacts(basePassport, runningShoeFeatures, sourceListing)
    : basePassport;
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
    candidates: [{ productId: "cloudrun-pro", productName: "CloudRun Pro", eligible: improved, rank: improved ? 1 : null, fitScore: improved ? 82 : 24, matchedFacts: improved ? ["Road terrain", "220 g weight", "S$179 price"] : ["S$179 price"], failedConstraints: improved ? [] : ["Road terrain is unknown"], missingEvidence: improved ? [] : ["Measured weight", "Humid-weather suitability"] }],
    scoringVersion: "1.0.0",
  };
}
