import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import type { FeatureDefinition } from "@/domain/market";
import { preserveExplicitListingFacts } from "./explicit-listing-facts";

const definitions: FeatureDefinition[] = [
  {
    key: "stability", label: "Stability type", dataType: "string", unit: null,
    required: false, demandWeight: 0.8, constraintImportance: 0.9,
    competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9,
    evidenceRequired: true, synonyms: ["stability", "neutral", "motion control"],
  },
  {
    key: "durability", label: "Durability", dataType: "string", unit: null,
    required: false, demandWeight: 0.6, constraintImportance: 0.6,
    competitiveCoverage: 0.7, competitiveDirection: "neutral", answerability: 0.9,
    evidenceRequired: false, synonyms: ["durability", "durable", "abrasion resistant"],
  },
];

describe("preserveExplicitListingFacts", () => {
  it("keeps explicitly labelled stability and durability facts when a draft omits them", () => {
    const passport = preserveExplicitListingFacts(
      makePassport({ features: [] }),
      definitions,
      [
        "CloudRun Pro",
        "Price: S$179.",
        "Stability type: Neutral support.",
        "Durability: Abrasion-resistant outsole for daily mileage.",
      ].join("\n"),
    );

    expect(passport.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "stability",
          value: "Neutral support",
          status: "seller_declared",
        }),
        expect.objectContaining({
          key: "durability",
          value: "Abrasion-resistant outsole for daily mileage",
          status: "seller_declared",
        }),
      ]),
    );
  });

  it("does not overwrite a non-missing extracted feature", () => {
    const passport = preserveExplicitListingFacts(
      makePassport({
        features: [
          {
            key: "stability",
            label: "Stability type",
            value: "Motion control",
            unit: null,
            status: "ai_inferred",
            confidence: 0.7,
            evidenceIds: [],
          },
        ],
      }),
      definitions,
      "Stability type: Neutral support.",
    );

    expect(passport.features[0]?.value).toBe("Motion control");
  });
});
