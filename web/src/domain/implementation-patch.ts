import type { ProductPassport } from "./passport";

export type ImplementationChange = {
  fieldPath: string;
  currentValue: unknown;
  proposedValue: unknown;
  evidenceIds: string[];
  reason: string;
};

export type ImplementationPatch = {
  version: "1.0.0";
  productId: string;
  category: string;
  generatedAt: string;
  changes: ImplementationChange[];
};

export function buildImplementationPatch(
  original: ProductPassport,
  current: ProductPassport,
  generatedAt = new Date().toISOString(),
): ImplementationPatch {
  const originalFeatures = new Map(original.features.map((feature) => [feature.key, feature]));
  const changes: ImplementationChange[] = [];
  if (original.description !== current.description) {
    changes.push({ fieldPath: "description", currentValue: original.description, proposedValue: current.description, evidenceIds: [], reason: "Improves the product description used by AI shopping systems." });
  }
  for (const feature of current.features) {
    const previous = originalFeatures.get(feature.key);
    if (!previous || JSON.stringify(previous.value) !== JSON.stringify(feature.value) || previous.status !== feature.status) {
      changes.push({ fieldPath: `features.${feature.key}`, currentValue: previous?.value ?? null, proposedValue: feature.value, evidenceIds: feature.evidenceIds, reason: `${feature.label} is more complete or better supported for recommendation queries.` });
    }
  }
  return { version: "1.0.0", productId: current.productId, category: current.category, generatedAt, changes };
}
