import type { FeatureDefinition } from "@/domain/market";
import type { FeatureValue, ProductPassport } from "@/domain/passport";

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueFromListing(
  definition: FeatureDefinition,
  rawListing: string,
): FeatureValue["value"] | null {
  if (definition.key === "weight") {
    const match = rawListing.match(/\b(?:weight|weighs?)\D{0,20}(\d+(?:\.\d+)?)\s*g\b/i)
      ?? rawListing.match(/\b(\d+(?:\.\d+)?)\s*g\b/i);
    return match ? Number(match[1]) : null;
  }

  const fieldNames = [
    definition.label,
    definition.key.replaceAll("_", " "),
    ...definition.synonyms,
  ];
  const matcher = new RegExp(
    `(?:^|\\n|[.;])\\s*(?:${fieldNames.map(escapePattern).join("|")})\\s*(?::|–|—|-)\\s*([^\\n.;]+)`,
    "i",
  );
  const match = rawListing.match(matcher);
  if (!match?.[1]?.trim()) return null;
  const value = match[1].trim();

  if (definition.dataType === "number") {
    const numeric = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (definition.dataType === "string_array") {
    return value
      .split(/,|\band\b|\//i)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

/**
 * Preserves facts written directly in a seller listing. These are seller-declared
 * source facts, not model inferences, and therefore win over a missing model field.
 */
export function preserveExplicitListingFacts(
  passport: ProductPassport,
  definitions: FeatureDefinition[],
  rawListing: string,
): ProductPassport {
  const existing = new Map(passport.features.map((feature) => [feature.key, feature]));

  for (const definition of definitions) {
    const value = valueFromListing(definition, rawListing);
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    const current = existing.get(definition.key);
    if (current && current.value !== null) continue;
    existing.set(definition.key, {
      key: definition.key,
      label: definition.label,
      value,
      unit: definition.unit,
      status: "seller_declared",
      confidence: 0.9,
      evidenceIds: [],
    });
  }

  return {
    ...passport,
    features: [...existing.values()],
  };
}
