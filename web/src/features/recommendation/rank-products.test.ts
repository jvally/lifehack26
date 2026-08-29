import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import { rankProducts } from "./rank-products";

describe("rankProducts", () => {
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