import { describe, expect, it } from "vitest";
import { buildImplementationPatch } from "./implementation-patch";

const base = {
  productId: "product-1", name: "Example", category: "clothing", description: "A shirt", price: 40, currency: "SGD" as const,
  features: [{ key: "material", label: "Material", value: null, unit: null, status: "missing" as const, confidence: 0, evidenceIds: [] }], useCases: [], suitableContexts: [], limitations: [], updatedAt: "2026-08-30T00:00:00.000Z",
};

describe("buildImplementationPatch", () => {
  it("returns machine-readable description and feature changes", () => {
    const patch = buildImplementationPatch(base, { ...base, description: "Organic cotton shirt", features: [{ ...base.features[0], value: "organic cotton", status: "verified", evidenceIds: ["e1"] }] });
    expect(patch.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldPath: "description", proposedValue: "Organic cotton shirt" }),
      expect.objectContaining({ fieldPath: "features.material", proposedValue: "organic cotton", evidenceIds: ["e1"] }),
    ]));
  });
});
