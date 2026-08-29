import { describe, expect, it } from "vitest";

import type { MarketSignal } from "@/domain/market";
import { makeCategoryIntelligence } from "@/test/fixtures";

import { buildCategoryIntelligence } from "./build-category-intelligence";

const signals: MarketSignal[] = [
  {
    id: "query-1",
    category: "running_shoes",
    signalType: "user_query",
    rawText: "Lightweight shoes for humid weather",
    parsedIntent: {
      category: "running_shoes",
      goal: "half_marathon",
      hardConstraints: {},
      preferences: ["lightweight"],
      contexts: ["humid_weather"],
    },
    featureKeys: ["weight", "breathability"],
    featureValues: {},
    frequency: 20,
    sourceLabel: "aggregated_demo_queries",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  },
  {
    id: "competitor-1",
    category: "running_shoes",
    signalType: "competitor_observation",
    rawText: "Competitor shoe weighs 245 g",
    parsedIntent: null,
    featureKeys: ["weight"],
    featureValues: { weight: 245, price: 189 },
    frequency: 1,
    sourceLabel: "permitted_competitor_dataset",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  },
];

describe("buildCategoryIntelligence", () => {
  it("derives demand, coverage, medians, and benchmark intents", () => {
    const result = buildCategoryIntelligence(
      "running_shoes",
      makeCategoryIntelligence().features,
      signals,
    );
    expect(result.features.find((item) => item.key === "weight")?.demandWeight).toBe(1);
    expect(result.peerMedians.weight).toBe(245);
    expect(result.peerPriceMedian).toBe(189);
    expect(result.intents).toHaveLength(1);
  });
});
