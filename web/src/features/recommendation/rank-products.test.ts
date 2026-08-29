import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import { rankProducts } from "./rank-products";

describe("rankProducts", () => {
  it("accepts a hard constraint when an array feature contains the requested value", () => {
    const result = rankProducts(
      "Road shoes",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: { terrain: "road" },
        preferences: [],
        contexts: [],
      },
      [
        {
          passport: makePassport({
            description: "Everyday road shoe",
            features: [
              {
                key: "terrain",
                label: "Running terrain",
                value: ["trail", "road"],
                unit: null,
                status: "verified",
                confidence: 1,
                evidenceIds: ["evidence-1"],
              },
            ],
          }),
          similarity: 0.9,
        },
      ],
    );

    expect(result.candidates[0]).toMatchObject({
      eligible: true,
      failedConstraints: [],
      missingEvidence: [],
    });
  });

  it("enforces numeric max constraints on feature values", () => {
    const result = rankProducts(
      "Lightweight shoes under 230 g",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: { weight_max: 230 },
        preferences: [],
        contexts: [],
      },
      [
        {
          passport: makePassport({
            description: "Everyday road shoe",
            features: [
              {
                key: "weight",
                label: "Measured weight",
                value: 240,
                unit: "g",
                status: "verified",
                confidence: 1,
                evidenceIds: ["evidence-1"],
              },
            ],
          }),
          similarity: 0.99,
        },
      ],
    );

    expect(result.candidates[0]).toMatchObject({
      eligible: false,
      failedConstraints: ["weight_max"],
    });
  });

  it("matches preference synonyms against feature keys", () => {
    const result = rankProducts(
      "Breathable shoes",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: {},
        preferences: ["airflow"],
        contexts: [],
      },
      [
        {
          passport: makePassport({
            description: "Everyday road shoe",
            features: [
              {
                key: "breathability",
                label: "Breathability",
                value: "high",
                unit: null,
                status: "verified",
                confidence: 1,
                evidenceIds: ["evidence-1"],
              },
            ],
          }),
          similarity: 0.8,
        },
      ],
    );

    expect(result.candidates[0]?.matchedFacts).toContain("airflow");
  });

  it("does not count a missing feature as a matched preference", () => {
    const result = rankProducts(
      "Lightweight shoes",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: {},
        preferences: ["lightweight"],
        contexts: [],
      },
      [
        {
          passport: makePassport({
            description: "Everyday road shoe",
            features: [
              {
                key: "weight",
                label: "Measured weight",
                value: null,
                unit: "g",
                status: "missing",
                confidence: 0,
                evidenceIds: [],
              },
            ],
          }),
          similarity: 0.8,
        },
      ],
    );

    expect(result.candidates[0]?.matchedFacts).toEqual([]);
  });

  it("rejects an over-budget product regardless of similarity", () => {
    const result = rankProducts(
      "Road shoes under S$200",
      {
        category: "running_shoes",
        goal: "road_running",
        hardConstraints: { price_max: 200 },
        preferences: ["lightweight"],
        contexts: [],
      },
      [
        {
          passport: makePassport({ price: 250 }),
          similarity: 0.99,
        },
        {
          passport: makePassport({
            productId: "within-budget",
            price: 179,
          }),
          similarity: 0.7,
        },
      ],
    );

    expect(
      result.candidates.find(
        (candidate) => candidate.productId === "product-cloudrun",
      ),
    ).toMatchObject({
      eligible: false,
      rank: null,
      failedConstraints: ["price_max"],
    });
    expect(
      result.candidates.find(
        (candidate) => candidate.productId === "within-budget",
      )?.rank,
    ).toBe(1);
  });

  it("marks unknown hard features as missing evidence", () => {
    const result = rankProducts(
      "Stable road shoes",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: { stability: "high" },
        preferences: [],
        contexts: [],
      },
      [{ passport: makePassport(), similarity: 0.9 }],
    );

    expect(result.candidates[0]).toMatchObject({
      eligible: false,
      missingEvidence: ["stability"],
    });
  });
});
