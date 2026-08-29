import rawRunningShoeFeatures from "./running-shoes-category.json";
import {
  FeatureDefinitionSchema,
  type FeatureDefinition,
} from "@/domain/market";

const categoryDefinitions: Record<string, FeatureDefinition[]> = {
  running_shoes: FeatureDefinitionSchema.array().parse(rawRunningShoeFeatures),
};

export function loadCategoryFeatureDefinitions(
  category: string,
): FeatureDefinition[] {
  const definitions = categoryDefinitions[category];
  if (!definitions) {
    throw new Error("CATEGORY_INTELLIGENCE_NOT_CONFIGURED");
  }
  return definitions.map((definition) => ({ ...definition }));
}
