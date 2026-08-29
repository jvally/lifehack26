import rawRunningShoeFeatures from "./running-shoes-category.json";
import {
  FeatureDefinitionSchema,
  type FeatureDefinition,
} from "@/domain/market";

type DefinitionSeed = [string, string, FeatureDefinition["dataType"], string | null, boolean, number, string[]];

const categoryDefinitions: Record<string, FeatureDefinition[] | DefinitionSeed[]> = {
  running_shoes: FeatureDefinitionSchema.array().parse(rawRunningShoeFeatures),
  clothing: [
    ["material", "Material", "string", null, true, 0.8, ["cotton", "linen", "wool", "recycled"]],
    ["fit", "Fit", "string", null, true, 0.8, ["slim", "regular", "oversized", "relaxed"]],
    ["size_range", "Size range", "string_array", null, true, 0.75, ["size", "xs", "xl", "inclusive sizing"]],
    ["weather_suitability", "Weather suitability", "string", null, false, 0.7, ["humid", "rain", "breathable", "warm"]],
    ["care", "Care instructions", "string", null, false, 0.45, ["machine washable", "dry clean"]],
    ["sustainability_claims", "Sustainability claims", "string", null, false, 0.7, ["organic", "recycled", "fair trade"]],
  ],
  furniture: [
    ["dimensions", "Dimensions", "string", null, true, 0.95, ["width", "height", "depth", "cm"]],
    ["material", "Material", "string", null, true, 0.8, ["wood", "steel", "leather", "rattan"]],
    ["assembly", "Assembly", "string", null, true, 0.65, ["assembly", "flat pack", "assembled"]],
    ["capacity", "Capacity", "string", null, false, 0.65, ["seats", "weight capacity", "storage"]],
    ["care", "Care instructions", "string", null, false, 0.45, ["wipe", "polish", "water resistant"]],
    ["delivery", "Delivery and returns", "string", null, false, 0.6, ["delivery", "returns", "warranty"]],
  ],
  accessories: [
    ["material", "Material", "string", null, true, 0.75, ["leather", "stainless steel", "canvas"]],
    ["dimensions", "Dimensions", "string", null, true, 0.75, ["size", "length", "capacity"]],
    ["compatibility", "Compatibility", "string", null, false, 0.7, ["compatible", "fits", "universal"]],
    ["durability", "Durability", "string", null, false, 0.6, ["water resistant", "scratch resistant"]],
    ["use_cases", "Use cases", "string_array", null, false, 0.7, ["travel", "work", "everyday"]],
    ["warranty", "Warranty", "string", null, false, 0.5, ["warranty", "guarantee"]],
  ],
  makeup: [
    ["shade", "Shade or shade range", "string", null, true, 0.9, ["shade", "tone", "undertone"]],
    ["skin_type", "Skin type", "string", null, true, 0.85, ["oily", "dry", "sensitive", "combination"]],
    ["finish", "Finish", "string", null, false, 0.7, ["matte", "dewy", "satin"]],
    ["ingredients", "Key ingredients", "string_array", null, true, 0.8, ["ingredients", "fragrance free", "vegan"]],
    ["wear_time", "Wear time", "string", null, false, 0.55, ["long lasting", "all day", "hours"]],
    ["application", "Application", "string", null, false, 0.6, ["brush", "fingertips", "quick routine"]],
  ],
  groceries: [
    ["ingredients", "Ingredients", "string_array", null, true, 0.95, ["ingredients", "wholegrain", "organic"]],
    ["allergens", "Allergens", "string_array", null, true, 0.95, ["allergen", "contains nuts", "gluten free"]],
    ["dietary_tags", "Dietary tags", "string_array", null, true, 0.85, ["vegan", "halal", "keto", "low sugar"]],
    ["nutrition", "Nutrition", "string", null, false, 0.8, ["calories", "protein", "sugar", "nutrition"]],
    ["storage", "Storage and shelf life", "string", null, false, 0.7, ["refrigerate", "shelf life", "expiry"]],
    ["origin", "Origin", "string", null, false, 0.45, ["made in", "origin", "Singapore"]],
  ],
  sports_equipment: [
    ["equipment_type", "Equipment type", "string", null, true, 0.75, ["racket", "mat", "ball", "helmet"]],
    ["size", "Size", "string", null, true, 0.8, ["size", "dimensions", "length"]],
    ["weight", "Weight", "number", "g", false, 0.7, ["weight", "lightweight"]],
    ["skill_level", "Skill level", "string", null, true, 0.75, ["beginner", "intermediate", "advanced"]],
    ["use_case", "Use case", "string_array", null, false, 0.7, ["training", "competition", "home"]],
    ["durability", "Durability", "string", null, false, 0.6, ["durable", "impact resistant"]],
  ],
};

const normalizedCategoryDefinitions: Record<string, FeatureDefinition[]> = Object.fromEntries(
  Object.entries(categoryDefinitions).map(([category, seeds]) => {
    if (seeds.length === 0 || !Array.isArray(seeds[0])) {
      return [category, seeds as FeatureDefinition[]];
    }
    return [category, (seeds as DefinitionSeed[]).map(([key, label, dataType, unit, required, demandWeight, synonyms]) => ({
    key, label, dataType, unit, required, demandWeight,
    constraintImportance: required ? 0.85 : 0.55,
    competitiveCoverage: 0.65,
    competitiveDirection: "neutral",
    answerability: 0.9,
    evidenceRequired: required,
    synonyms,
    }))];
  }),
);

export function loadCategoryFeatureDefinitions(
  category: string,
): FeatureDefinition[] {
  const definitions = normalizedCategoryDefinitions[category];
  if (!definitions) {
    throw new Error("CATEGORY_INTELLIGENCE_NOT_CONFIGURED");
  }
  return definitions.map((definition) => ({ ...definition }));
}
