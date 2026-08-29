import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

export function makePassport(
  overrides: Partial<ProductPassport> = {},
): ProductPassport {
  return {
    productId: "product-cloudrun",
    name: "CloudRun Pro",
    category: "running_shoes",
    description: "Lightweight road running shoe",
    price: 179,
    currency: "SGD",
    features: [],
    useCases: [],
    suitableContexts: [],
    limitations: [],
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

export function makeCategoryIntelligence(): CategoryIntelligence {
  return {
    category: "running_shoes",
    features: [
      {
        key: "weight",
        label: "Measured weight",
        dataType: "number",
        unit: "g",
        required: true,
        demandWeight: 0.9,
        constraintImportance: 0.8,
        competitiveCoverage: 0.75,
        competitiveDirection: "lower",
        answerability: 1,
        evidenceRequired: true,
        synonyms: ["lightweight", "grams"],
      },
      {
        key: "breathability",
        label: "Breathability",
        dataType: "string",
        unit: null,
        required: false,
        demandWeight: 0.8,
        constraintImportance: 0.7,
        competitiveCoverage: 0.6,
        competitiveDirection: "neutral",
        answerability: 0.8,
        evidenceRequired: true,
        synonyms: ["ventilated", "airflow"],
      },
    ],
    intents: [
      {
        id: "humid-half-marathon",
        label: "Humid-weather half-marathon training",
        weight: 10,
        requiredFeatures: ["weight"],
        preferredFeatures: ["breathability"],
      },
    ],
    peerMedians: { weight: 245 },
    peerPriceMedian: 189,
  };
}
