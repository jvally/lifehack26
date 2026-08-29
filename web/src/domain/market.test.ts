import { describe, expect, it } from "vitest";
import {
  CategoryIntelligenceSchema,
  QueryIntentSchema,
} from "./market";

describe("market schemas", () => {
  it("accepts structured buyer intent", () => {
    const parsed = QueryIntentSchema.parse({
      category: "running_shoes",
      goal: "half_marathon",
      hardConstraints: { price_max: 200 },
      preferences: ["lightweight"],
      contexts: ["humid_weather"],
    });

    expect(parsed.hardConstraints.price_max).toBe(200);
  });

  it("requires normalized feature weights", () => {
    expect(() =>
      CategoryIntelligenceSchema.parse({
        category: "running_shoes",
        features: [
          {
            key: "weight",
            label: "Weight",
            dataType: "number",
            unit: "g",
            required: true,
            demandWeight: 1.2,
            constraintImportance: 1,
            competitiveCoverage: 0.8,
            competitiveDirection: "lower",
            answerability: 1,
            evidenceRequired: true,
            synonyms: ["lightweight"],
          },
        ],
        intents: [],
        peerMedians: {},
        peerPriceMedian: null,
      }),
    ).toThrow();
  });
});
