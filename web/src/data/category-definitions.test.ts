import { describe, expect, it } from "vitest";
import { loadCategoryFeatureDefinitions } from "./category-definitions";

describe("loadCategoryFeatureDefinitions", () => {
  it("loads definitions for a supported category", () => {
    const definitions = loadCategoryFeatureDefinitions("running_shoes");

    expect(definitions).toHaveLength(12);
    expect(definitions.every((definition) => definition.key.length > 0)).toBe(
      true,
    );
  });

  it("loads definitions for every supported retail category", () => {
    for (const category of ["clothing", "furniture", "accessories", "makeup", "groceries", "sports_equipment"]) {
      expect(loadCategoryFeatureDefinitions(category).length).toBeGreaterThan(0);
    }
  });

  it("rejects an unsupported category instead of using another category", () => {
    expect(() => loadCategoryFeatureDefinitions("laptops")).toThrow(
      "CATEGORY_INTELLIGENCE_NOT_CONFIGURED",
    );
  });
});
