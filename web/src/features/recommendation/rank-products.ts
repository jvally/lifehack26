import type { QueryIntent } from "@/domain/market";
import type { FeatureValue, ProductPassport } from "@/domain/passport";
import type { RecommendationResult } from "@/domain/recommendation";

type FeatureScalar = string | number | boolean | string[];

type CandidateInput = {
  passport: ProductPassport;
  similarity: number;
};

type NumericOperator = "max" | "min";

const preferenceAliases: Record<string, string[]> = {
  airflow: ["breathability", "ventilation", "ventilated"],
  breathable: ["breathability", "airflow", "ventilation", "ventilated"],
  lightweight: ["weight", "light"],
  light: ["weight", "lightweight"],
  waterproof: ["water resistant", "waterproof"],
  "water resistant": ["waterproof", "water resistant"],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function comparableValue(value: FeatureScalar): string {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).join(" ")
    : typeof value === "string"
      ? normalizeText(value)
      : String(value);
}

function valuesEqual(
  left: FeatureScalar,
  right: string | number | boolean,
): boolean {
  if (Array.isArray(left)) {
    return left.some((item) => valuesEqual(item, right));
  }
  if (typeof left === "string" && typeof right === "string") {
    return normalizeText(left) === normalizeText(right);
  }
  return left === right;
}

function numericValue(value: FeatureScalar | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function getNumericConstraint(key: string): {
  featureKey: string;
  operator: NumericOperator;
} | null {
  const match = key.match(/^(.+)_(max|min)$/);
  return match
    ? { featureKey: match[1], operator: match[2] as NumericOperator }
    : null;
}

function featureText(passport: ProductPassport): string {
  return [
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.features.flatMap((feature) =>
      feature.value === null || feature.status === "missing"
        ? []
        : [feature.key, feature.label, comparableValue(feature.value)],
    ),
  ]
    .map(normalizeText)
    .join(" ");
}

function searchTerms(term: string): string[] {
  const normalized = normalizeText(term);
  return [normalized, ...(preferenceAliases[normalized] ?? [])].map(normalizeText);
}

function matchesPreference(term: string, text: string): boolean {
  return searchTerms(term).some(
    (candidate) => candidate.length > 0 && text.includes(candidate),
  );
}

function findFeature(
  passport: ProductPassport,
  key: string,
): FeatureValue | undefined {
  const normalizedKey = normalizeText(key);
  return passport.features.find(
    (feature) => normalizeText(feature.key) === normalizedKey,
  );
}

function constraintOutcome(
  passport: ProductPassport,
  key: string,
  expected: string | number | boolean,
): "pass" | "failed" | "missing" {
  if (key === "price_max" || key === "price_min") {
    if (passport.price === null) return "missing";
    const passes =
      key === "price_max"
        ? passport.price <= Number(expected)
        : passport.price >= Number(expected);
    return passes ? "pass" : "failed";
  }

  const numericConstraint = getNumericConstraint(key);
  const featureKey = numericConstraint?.featureKey ?? key;
  const feature = findFeature(passport, featureKey);
  if (!feature || feature.value === null || feature.status === "missing") {
    return "missing";
  }

  if (numericConstraint) {
    const actual = numericValue(feature.value);
    const target = typeof expected === "number" ? expected : Number(expected);
    if (actual === null || !Number.isFinite(target)) return "missing";
    const passes =
      numericConstraint.operator === "max" ? actual <= target : actual >= target;
    return passes ? "pass" : "failed";
  }

  return valuesEqual(feature.value, expected) ? "pass" : "failed";
}

export function rankProducts(
  query: string,
  intent: QueryIntent,
  inputs: CandidateInput[],
): RecommendationResult {
  const candidates: RecommendationResult["candidates"] = inputs.map(
    ({ passport, similarity }) => {
      const failedConstraints: string[] = [];
      const missingEvidence: string[] = [];
      for (const [key, expected] of Object.entries(intent.hardConstraints)) {
        const outcome = constraintOutcome(passport, key, expected);
        if (outcome === "failed") failedConstraints.push(key);
        if (outcome === "missing") missingEvidence.push(key);
      }

      const text = featureText(passport);
      const requestedTerms = [...intent.preferences, ...intent.contexts];
      const matchedTerms = requestedTerms.filter((term) =>
        matchesPreference(term, text),
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
        productName: passport.name,
        eligible:
          failedConstraints.length === 0 && missingEvidence.length === 0,
        rank: null,
        fitScore,
        matchedFacts: matchedTerms,
        failedConstraints,
        missingEvidence,
      };
    },
  );
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
