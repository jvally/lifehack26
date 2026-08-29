import { useState } from "react";
import type { FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { EvidenceBadge } from "./evidence-badge";

const COMPACT_FEATURE_COUNT = 3;

function displayValue(value: ProductPassport["features"][number]["value"]) {
  return Array.isArray(value)
    ? value.join(", ")
    : value === null
      ? "Not supplied"
      : String(value);
}

export function ProductPassportPanel({
  passport,
  definitions,
  changedFeatureKeys = [],
}: {
  passport: ProductPassport;
  definitions: FeatureDefinition[];
  changedFeatureKeys?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const byKey = new Map(passport.features.map((feature) => [feature.key, feature]));
  const hasHiddenFeatures = definitions.length > COMPACT_FEATURE_COUNT;
  const visibleDefinitions = expanded
    ? definitions
    : definitions.slice(0, COMPACT_FEATURE_COUNT);
  const hiddenFeatureCount = definitions.length - COMPACT_FEATURE_COUNT;

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="passport-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Product truth</p>
          <h2 id="passport-heading" className="mt-2 text-2xl font-semibold tracking-tight">
            {passport.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {passport.description}
          </p>
        </div>
        <span className="mono-label shrink-0 rounded-lg border border-[var(--ink)] px-3 py-2 font-semibold">
          {passport.currency} {passport.price}
        </span>
      </div>
      <div id="product-features" className="mt-7 space-y-2">
        {visibleDefinitions.map((definition) => {
          const feature = byKey.get(definition.key) ?? {
            key: definition.key,
            label: definition.label,
            value: null,
            unit: definition.unit,
            status: "missing" as const,
            confidence: 0,
            evidenceIds: [],
          };

          return (
            <div
              key={definition.key}
              className={`rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 ${
                changedFeatureKeys.includes(definition.key) ? "changed-feature" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--ink)]">{definition.label}</p>
                <EvidenceBadge status={feature.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {displayValue(feature.value)}
                {feature.value !== null && feature.unit ? ` ${feature.unit}` : ""}
              </p>
            </div>
          );
        })}
      </div>
      {hasHiddenFeatures && (
        <button
          type="button"
          aria-controls="product-features"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="button-secondary mt-5 min-h-11 w-full px-4 py-2 text-sm font-semibold"
        >
          {expanded
            ? "Show less"
            : `Show more (${hiddenFeatureCount} more ${hiddenFeatureCount === 1 ? "detail" : "details"})`}
        </button>
      )}
    </section>
  );
}
