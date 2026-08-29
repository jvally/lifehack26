import { describe, expect, it } from "vitest";
import { ProductPassportSchema } from "./passport";

const validPassport = {
  productId: "product-cloudrun",
  name: "CloudRun Pro",
  category: "running_shoes",
  description: "Lightweight road running shoe",
  price: 179,
  currency: "SGD",
  features: [
    {
      key: "weight",
      label: "Weight",
      value: 220,
      unit: "g",
      status: "verified",
      confidence: 0.95,
      evidenceIds: ["evidence-weight"],
    },
  ],
  useCases: ["half_marathon"],
  suitableContexts: ["humid_weather"],
  limitations: [],
  updatedAt: "2026-08-29T00:00:00.000Z",
};

describe("ProductPassportSchema", () => {
  it("accepts a valid passport", () => {
    expect(ProductPassportSchema.parse(validPassport)).toEqual(validPassport);
  });

  it("rejects confidence above one", () => {
    const invalid = structuredClone(validPassport);
    invalid.features[0].confidence = 1.1;

    expect(() => ProductPassportSchema.parse(invalid)).toThrow();
  });

  it("rejects an unknown provenance status", () => {
    const invalid = structuredClone(validPassport) as Record<string, unknown>;
    const features = invalid.features as Array<Record<string, unknown>>;
    features[0].status = "competitor_claim";

    expect(() => ProductPassportSchema.parse(invalid)).toThrow();
  });
});
