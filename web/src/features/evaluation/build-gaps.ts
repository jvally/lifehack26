import type { Gap } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

function roundPriority(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function buildGaps(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
): Gap[] {
  const features = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );

  return intelligence.features
    .flatMap((definition): Gap[] => {
      const feature = features.get(definition.key);
      const missing =
        !feature || feature.value === null || feature.status === "missing";
      const evidenceMissing =
        definition.evidenceRequired &&
        feature !== undefined &&
        feature.value !== null &&
        feature.evidenceIds.length === 0;
      const lowConfidence =
        feature !== undefined &&
        feature.value !== null &&
        feature.confidence < 0.6;
      if (!missing && !evidenceMissing && !lowConfidence) {
        return [];
      }
      const confidenceGap = feature ? 1 - feature.confidence : 1;
      const priority = roundPriority(
        100 *
          (0.35 * definition.demandWeight +
            0.3 * definition.constraintImportance +
            0.2 * definition.competitiveCoverage +
            0.15 * confidenceGap) *
          definition.answerability,
      );
      const reason = missing
        ? "missing"
        : evidenceMissing
          ? "evidence_required"
          : "low_confidence";
      const evidenceRequested =
        definition.evidenceRequired &&
        (missing || evidenceMissing || feature?.status === "ai_inferred");
      const suffix = evidenceRequested
        ? " Please provide a specification or other supporting evidence if available."
        : "";

      return [
        {
          featureKey: definition.key,
          label: definition.label,
          reason,
          priority,
          question: "What is the " + definition.label.toLowerCase() + " for this product?" + suffix,
          evidenceRequested,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.featureKey.localeCompare(right.featureKey),
    );
}