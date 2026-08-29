import type { ScoreBreakdown } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { FeatureValue, ProductPassport } from "@/domain/passport";

const evidenceFactor = {
  verified: 1,
  seller_declared: 0.6,
  ai_inferred: 0.25,
  missing: 0,
} as const;

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function present(feature: FeatureValue | undefined): boolean {
  return Boolean(feature && feature.value !== null && feature.status !== "missing");
}

export function scoreReadiness(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
): ScoreBreakdown & { coveredIntentIds: string[] } {
  const features = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );
  const totalWeight =
    intelligence.features.reduce(
      (sum, feature) => sum + Math.max(feature.demandWeight, 0.1),
      0,
    ) || 1;
  const completeness = roundScore(
    (100 *
      intelligence.features.reduce(
        (sum, definition) =>
          sum +
          (present(features.get(definition.key))
            ? Math.max(definition.demandWeight, 0.1)
            : 0),
        0,
      )) /
      totalWeight,
  );
  const evidenceQuality = roundScore(
    (100 *
      intelligence.features.reduce((sum, definition) => {
        const feature = features.get(definition.key);
        const factor = feature ? evidenceFactor[feature.status] : 0;
        return sum + Math.max(definition.demandWeight, 0.1) * factor;
      }, 0)) /
      totalWeight,
  );
  const coveredIntentIds = intelligence.intents
    .filter((intent) => {
      const requiredCovered = intent.requiredFeatures.every((key) =>
        present(features.get(key)),
      );
      const preferredCovered =
        intent.preferredFeatures.length === 0 ||
        intent.preferredFeatures.some((key) => present(features.get(key)));
      return requiredCovered && preferredCovered;
    })
    .map((intent) => intent.id);
  const totalIntentWeight =
    intelligence.intents.reduce((sum, intent) => sum + intent.weight, 0) || 1;
  const intentCoverage = roundScore(
    (100 *
      intelligence.intents
        .filter((intent) => coveredIntentIds.includes(intent.id))
        .reduce((sum, intent) => sum + intent.weight, 0)) /
      totalIntentWeight,
  );
  const searchableText = [
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
  ]
    .join(" ")
    .toLowerCase();
  const discoverability = roundScore(
    (100 *
      intelligence.features.reduce((sum, definition) => {
        const represented =
          present(features.get(definition.key)) ||
          definition.synonyms.some((term) =>
            searchableText.includes(term.toLowerCase()),
          );
        return sum + (represented ? Math.max(definition.demandWeight, 0.1) : 0);
      }, 0)) /
      totalWeight,
  );
  const duplicateKeys = passport.features.length - features.size;
  const missingCurrencyPenalty =
    passport.price !== null && passport.currency === null ? 15 : 0;
  const consistency = roundScore(
    100 - duplicateKeys * 20 - missingCurrencyPenalty,
  );
  const total = roundScore(
    0.3 * completeness +
      0.25 * intentCoverage +
      0.2 * evidenceQuality +
      0.15 * discoverability +
      0.1 * consistency,
  );

  return {
    completeness,
    intentCoverage,
    evidenceQuality,
    discoverability,
    consistency,
    total,
    coveredIntentIds,
  };
}