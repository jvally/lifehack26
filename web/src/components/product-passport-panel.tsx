import { useState } from "react";
import type { FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { EvidenceBadge } from "./evidence-badge";

const EXPANDABLE_VALUE_LENGTH = 80;

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
  const [expandedFeatureKeys, setExpandedFeatureKeys] = useState<string[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      passport.features.map((feature) => [
        feature.key,
        feature.value === null ? "" : displayValue(feature.value),
      ]),
    ),
  );
  const byKey = new Map(passport.features.map((feature) => [feature.key, feature]));

  const toggleFeature = (key: string) => {
    setExpandedFeatureKeys((current) =>
      current.includes(key)
        ? current.filter((featureKey) => featureKey !== key)
        : [...current, key],
    );
  };

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
      <div className="mt-7 grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {definitions.map((definition) => {
          const feature = byKey.get(definition.key) ?? {
            key: definition.key,
            label: definition.label,
            value: null,
            unit: definition.unit,
            status: "missing" as const,
            confidence: 0,
            evidenceIds: [],
          };
          const expanded = expandedFeatureKeys.includes(definition.key);
          const inputId = `product-feature-${definition.key}`;
          const detailId = `${inputId}-details`;
          const hasLongValue = displayValue(feature.value).length > EXPANDABLE_VALUE_LENGTH;

          return (
            <div
              key={definition.key}
              className={`min-h-[148px] rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4 ${
                changedFeatureKeys.includes(definition.key) ? "changed-feature" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--ink)]">{definition.label}</p>
                <EvidenceBadge status={feature.status} />
              </div>
              <label htmlFor={inputId} className="sr-only">
                {definition.label}
              </label>
              <input
                id={inputId}
                value={draftValues[definition.key] ?? ""}
                onChange={(event) =>
                  setDraftValues((current) => ({
                    ...current,
                    [definition.key]: event.target.value,
                  }))
                }
                className="mt-3 min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)]"
                placeholder={`Enter ${definition.label.toLowerCase()}`}
              />
              {hasLongValue && (
                <button
                  type="button"
                  aria-controls={detailId}
                  aria-expanded={expanded}
                  onClick={() => toggleFeature(definition.key)}
                  className="mt-2 text-sm font-semibold text-[var(--ink)] underline underline-offset-4"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
              {hasLongValue && expanded && (
                <div id={detailId} className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                  <p>
                    Current value: {displayValue(feature.value)}
                    {feature.value !== null && feature.unit ? ` ${feature.unit}` : ""}
                  </p>
                  <p className="mt-1">Status: {feature.status.replace("_", " ")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
