import { CategoryIntelligenceSchema } from "@/domain/market";
import type {
  CategoryIntelligence,
  FeatureDefinition,
  MarketSignal,
} from "@/domain/market";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function buildCategoryIntelligence(
  category: string,
  baseFeatures: FeatureDefinition[],
  signals: MarketSignal[],
): CategoryIntelligence {
  const categorySignals = signals.filter((signal) => signal.category === category);
  const querySignals = categorySignals.filter(
    (signal) => signal.signalType === "user_query",
  );
  const competitorSignals = categorySignals.filter(
    (signal) => signal.signalType === "competitor_observation",
  );
  const demandTotals = new Map<string, number>();
  for (const signal of querySignals) {
    for (const key of signal.featureKeys) {
      demandTotals.set(key, (demandTotals.get(key) ?? 0) + signal.frequency);
    }
  }
  const maxDemand = Math.max(1, ...demandTotals.values());
  const features = baseFeatures.map((feature) => ({
    ...feature,
    demandWeight: (demandTotals.get(feature.key) ?? 0) / maxDemand,
    competitiveCoverage:
      competitorSignals.length === 0
        ? feature.competitiveCoverage
        : competitorSignals.filter((signal) => signal.featureKeys.includes(feature.key))
            .length / competitorSignals.length,
  }));
  const peerMedians = Object.fromEntries(
    baseFeatures.flatMap((feature) => {
      const value = median(
        competitorSignals.flatMap((signal) => {
          const observed = signal.featureValues[feature.key];
          return typeof observed === "number" ? [observed] : [];
        }),
      );
      return value === null ? [] : [[feature.key, value]];
    }),
  );
  const priceValues = competitorSignals.flatMap((signal) => {
    const value = signal.featureValues.price;
    return typeof value === "number" ? [value] : [];
  });
  const highConstraintKeys = new Set(
    features
      .filter((feature) => feature.constraintImportance >= 0.8)
      .map((feature) => feature.key),
  );
  const intents = querySignals.flatMap((signal) =>
    signal.parsedIntent
      ? [
          {
            id: signal.id,
            label: signal.rawText,
            weight: Math.max(1, signal.frequency),
            requiredFeatures: signal.featureKeys.filter((key) =>
              highConstraintKeys.has(key),
            ),
            preferredFeatures: signal.featureKeys.filter(
              (key) => !highConstraintKeys.has(key),
            ),
          },
        ]
      : [],
  );

  return CategoryIntelligenceSchema.parse({
    category,
    features,
    intents,
    peerMedians,
    peerPriceMedian: median(priceValues),
  });
}
