import { describe, expect, it } from "vitest";
import { buildVisibilityReport } from "./build-visibility-report";
import { makeCategoryIntelligence } from "@/test/fixtures";

describe("buildVisibilityReport", () => {
  it("reports demand-weighted visibility and missed shopper intents", () => {
    const intelligence = { ...makeCategoryIntelligence(), intents: [
      { id: "high-demand", label: "High demand", weight: 8, requiredFeatures: [], preferredFeatures: [] },
      { id: "low-demand", label: "Low demand", weight: 2, requiredFeatures: [], preferredFeatures: [] },
    ] };
    const evaluation = {
      readiness: { completeness: 60, intentCoverage: 80, evidenceQuality: 60, discoverability: 60, consistency: 100, total: 70 },
      competitiveness: { peerFeatureCoverage: 0, differentiation: 0, relativeSpecifications: 0, priceFit: 0, highDemandQueryCoverage: 0, total: 0 },
      gaps: [], coveredIntentIds: ["high-demand"], generatedAt: "2026-08-30T00:00:00.000Z", scoringVersion: "1.0.0" as const,
    };

    expect(buildVisibilityReport(evaluation, intelligence, [50, 70])).toMatchObject({
      visibilityRate: 50,
      demandWeightedVisibility: 80,
      averageCompetitorReadiness: 60,
      missedIntents: ["Low demand"],
    });
  });
});
