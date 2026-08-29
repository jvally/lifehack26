import type { Gap } from "@/domain/evaluation";

export function selectNextGap(
  gaps: Gap[],
  askedFeatureKeys: string[],
): Gap | null {
  const asked = new Set(askedFeatureKeys);
  return (
    [...gaps]
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          left.featureKey.localeCompare(right.featureKey),
      )
      .find((gap) => !asked.has(gap.featureKey)) ?? null
  );
}