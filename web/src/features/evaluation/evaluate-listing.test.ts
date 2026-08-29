import { describe, expect, it } from "vitest";
import { makeCategoryIntelligence, makePassport } from "@/test/fixtures";
import { evaluateListing } from "./evaluate-listing";

describe("evaluateListing", () => {
  it("reports missing high-demand features", () => {
    const evaluation = evaluateListing(
      makePassport(),
      makeCategoryIntelligence(),
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(evaluation.gaps.map((gap) => gap.featureKey)).toEqual([
      "weight",
      "breathability",
    ]);
    expect(evaluation.readiness.total).toBeLessThan(50);
  });

  it("rewards verified feature coverage", () => {
    const passport = makePassport({
      features: [
        {
          key: "weight",
          label: "Measured weight",
          value: 220,
          unit: "g",
          status: "verified",
          confidence: 0.95,
          evidenceIds: ["weight-spec"],
        },
        {
          key: "breathability",
          label: "Breathability",
          value: "high",
          unit: null,
          status: "verified",
          confidence: 0.9,
          evidenceIds: ["mesh-spec"],
        },
      ],
    });

    const evaluation = evaluateListing(
      passport,
      makeCategoryIntelligence(),
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(evaluation.gaps).toHaveLength(0);
    expect(evaluation.readiness.completeness).toBe(100);
    expect(evaluation.readiness.evidenceQuality).toBe(100);
    expect(evaluation.coveredIntentIds).toEqual(["humid-half-marathon"]);
  });
});