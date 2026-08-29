import type { QueryIntent } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { RecommendationResult } from "@/domain/recommendation";

type CandidateInput = {
  passport: ProductPassport;
  similarity: number;
};

function featureText(passport: ProductPassport): string {
  return [
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.features.flatMap((feature) => [
      feature.key,
      feature.label,
      String(feature.value ?? ""),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

export function rankProducts(
  query: string,
  intent: QueryIntent,
  inputs: CandidateInput[],
): RecommendationResult {
  const candidates = inputs.map(({ passport, similarity }) => {
    const features = new Map(
      passport.features.map((feature) => [feature.key, feature]),
    );
    const failedConstraints: string[] = [];
    const missingEvidence: string[] = [];
    for (const [key, expected] of Object.entries(intent.hardConstraints)) {
      if (key === "price_max") {
        if (passport.price === null) {
          missingEvidence.push(key);
        } else if (passport.price > Number(expected)) {
          failedConstraints.push(key);
        }
        continue;
      }
      if (key === "price_min") {
        if (passport.price === null) {
          missingEvidence.push(key);
        } else if (passport.price < Number(expected)) {
          failedConstraints.push(key);
        }
        continue;
      }
      const feature = features.get(key);
      if (!feature || feature.value === null || feature.status === "missing") {
        missingEvidence.push(key);
      } else if (
        String(feature.value).toLowerCase() !== String(expected).toLowerCase()
      ) {
        failedConstraints.push(key);
      }
    }
    const text = featureText(passport);
    const requestedTerms = [...intent.preferences, ...intent.contexts];
    const matchedTerms = requestedTerms.filter((term) =>
      text.includes(term.toLowerCase().replaceAll("_", " ")),
    );
    const preferenceCoverage =
      requestedTerms.length === 0
        ? 1
        : matchedTerms.length / requestedTerms.length;
    const presentFeatures = passport.features.filter(
      (feature) => feature.value !== null && feature.status !== "missing",
    );
    const evidenceQuality =
      presentFeatures.length === 0
        ? 0
        : presentFeatures.reduce((sum, feature) => {
            if (feature.status === "verified") return sum + 1;
            if (feature.status === "seller_declared") return sum + 0.6;
            if (feature.status === "ai_inferred") return sum + 0.25;
            return sum;
          }, 0) / presentFeatures.length;
    const fitScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          100 *
            (0.55 * Math.max(0, Math.min(1, similarity)) +
              0.3 * preferenceCoverage +
              0.15 * evidenceQuality),
        ),
      ),
    );
    return {
      productId: passport.productId,
      eligible:
        failedConstraints.length === 0 && missingEvidence.length === 0,
      rank: null,
      fitScore,
      matchedFacts: matchedTerms,
      failedConstraints,
      missingEvidence,
    };
  });
  const eligible = candidates
    .filter((candidate) => candidate.eligible)
    .sort(
      (left, right) =>
        right.fitScore - left.fitScore ||
        left.productId.localeCompare(right.productId),
    );
  eligible.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });
  return {
    query,
    intent,
    candidates,
    scoringVersion: "1.0.0",
  };
}