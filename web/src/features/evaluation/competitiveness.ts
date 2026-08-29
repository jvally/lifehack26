import type { CompetitivenessBreakdown } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function scoreCompetitiveness(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
  highDemandQueryCoverage: number,
): CompetitivenessBreakdown {
  const featureMap = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );
  const competitiveDefinitions = intelligence.features.filter(
    (feature) => feature.competitiveCoverage >= 0.5,
  );
  const peerFeatureCoverage = roundScore(
    competitiveDefinitions.length === 0
      ? 100
      : (100 *
          competitiveDefinitions.filter(
            (definition) =>
              featureMap.get(definition.key)?.value !== null &&
              featureMap.get(definition.key)?.status !== "missing",
          ).length) /
          competitiveDefinitions.length,
  );
  const differentiatingDefinitions = intelligence.features.filter(
    (feature) => feature.competitiveCoverage < 0.5,
  );
  const differentiation = roundScore(
    differentiatingDefinitions.length === 0
      ? 50
      : (100 *
          differentiatingDefinitions.filter(
            (definition) =>
              featureMap.get(definition.key)?.value !== null &&
              ["verified", "seller_declared"].includes(
                featureMap.get(definition.key)?.status ?? "missing",
              ),
          ).length) /
          differentiatingDefinitions.length,
  );
  const comparableScores = Object.entries(intelligence.peerMedians).flatMap(
    ([key, median]) => {
      const definition = intelligence.features.find(
        (feature) => feature.key === key,
      );
      const value = featureMap.get(key)?.value;
      if (!definition || typeof value !== "number" || median <= 0) {
        return [];
      }
      if (definition.competitiveDirection === "lower") {
        return [value <= median ? 100 : (100 * median) / value];
      }
      if (definition.competitiveDirection === "higher") {
        return [value >= median ? 100 : (100 * value) / median];
      }
      return [100];
    },
  );
  const relativeSpecifications = roundScore(
    comparableScores.length === 0
      ? 50
      : comparableScores.reduce((sum, value) => sum + value, 0) /
          comparableScores.length,
  );
  const priceFit = roundScore(
    passport.price === null || intelligence.peerPriceMedian === null
      ? 50
      : passport.price <= intelligence.peerPriceMedian
        ? 100
        : (100 * intelligence.peerPriceMedian) / passport.price,
  );
  const total = roundScore(
    0.35 * peerFeatureCoverage +
      0.25 * differentiation +
      0.2 * relativeSpecifications +
      0.1 * priceFit +
      0.1 * highDemandQueryCoverage,
  );

  return {
    peerFeatureCoverage,
    differentiation,
    relativeSpecifications,
    priceFit,
    highDemandQueryCoverage,
    total,
  };
}