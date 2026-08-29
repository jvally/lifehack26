import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import { applySellerAnswer } from "./answer-application";

describe("applySellerAnswer", () => {
  it("marks supported evidence as verified", () => {
    const updated = applySellerAnswer(
      makePassport(),
      {
        featureKey: "weight",
        label: "Measured weight",
        value: 220,
        unit: "g",
        unknown: false,
        evidenceId: "evidence-weight",
      },
      { supported: true },
      new Date("2026-08-29T01:00:00.000Z"),
    );

    expect(updated.features[0]).toMatchObject({
      key: "weight",
      value: 220,
      status: "verified",
      evidenceIds: ["evidence-weight"],
    });
  });

  it("does not fabricate a value when the seller selects unknown", () => {
    const original = makePassport();
    const updated = applySellerAnswer(
      original,
      {
        featureKey: "weight",
        label: "Measured weight",
        value: null,
        unit: "g",
        unknown: true,
        evidenceId: null,
      },
      { supported: false },
      new Date("2026-08-29T01:00:00.000Z"),
    );

    expect(updated.features).toEqual([]);
  });
});