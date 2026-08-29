import { useEffect, useRef, useState } from "react";
import type { FeatureDefinition } from "@/domain/market";
import type { FeatureScalar, ProductPassport } from "@/domain/passport";
import { EvidenceBadge } from "./evidence-badge";

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
  onSaveFeature,
}: {
  passport: ProductPassport;
  definitions: FeatureDefinition[];
  changedFeatureKeys?: string[];
  onSaveFeature?: (key: string, value: FeatureScalar) => Promise<void>;
}) {
  const visibleFeatureKeys = new Set([
    "weight",
    "terrain",
    "durability",
    "breathability",
    "cushioning",
    "distance_suitability",
  ]);
  const visibleDefinitions = definitions.filter(({ key }) => visibleFeatureKeys.has(key));
  const [expandedFeatureKeys, setExpandedFeatureKeys] = useState<string[]>([]);
  const [overflowingFeatureKeys, setOverflowingFeatureKeys] = useState<string[]>([]);
  const [savingFeatureKeys, setSavingFeatureKeys] = useState<string[]>([]);
  const [savedFeatureKeys, setSavedFeatureKeys] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previewRefs = useRef(new Map<string, HTMLParagraphElement>());
  const saveTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      passport.features.map((feature) => [
        feature.key,
        feature.value === null ? "" : displayValue(feature.value),
      ]),
    ),
  );
  const byKey = new Map(passport.features.map((feature) => [feature.key, feature]));

  useEffect(() => {
    const updateOverflowingFeatures = () => {
      const nextKeys = definitions
        .filter(({ key }) => {
          const preview = previewRefs.current.get(key);
          return preview ? preview.scrollHeight > preview.clientHeight + 1 : false;
        })
        .map(({ key }) => key);

      setOverflowingFeatureKeys((current) =>
        current.length === nextKeys.length &&
        current.every((key, index) => key === nextKeys[index])
          ? current
          : nextKeys,
      );
    };

    updateOverflowingFeatures();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateOverflowingFeatures);
    previewRefs.current.forEach((preview) => observer.observe(preview));
    return () => observer.disconnect();
  }, [definitions, passport.features]);

  const toggleFeature = (key: string) => {
    setExpandedFeatureKeys((current) =>
      current.includes(key)
        ? current.filter((featureKey) => featureKey !== key)
        : [...current, key],
    );
  };

  const saveFeature = async (key: string) => {
    const rawValue = draftValues[key]?.trim() ?? "";
    if (!rawValue) return;
    setSavedFeatureKeys((current) => current.filter((featureKey) => featureKey !== key));
    setSavingFeatureKeys((current) => [...new Set([...current, key])]);
    setSaveError(null);
    try {
      const definition = definitions.find((item) => item.key === key);
      if (!definition) throw new Error("Unknown product specification.");
      const value = definition.dataType === "number"
        ? Number(rawValue)
        : definition.dataType === "string_array"
          ? rawValue.split(",").map((item) => item.trim()).filter(Boolean)
          : rawValue;
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error("Enter a valid number.");
      }
      await onSaveFeature?.(key, value);
      await new Promise((resolve) => setTimeout(resolve, 450));
      setSavedFeatureKeys((current) => [...new Set([...current, key])]);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "We could not save this specification.");
    } finally {
      setSavingFeatureKeys((current) => current.filter((featureKey) => featureKey !== key));
    }
  };

  useEffect(
    () => () => {
      saveTimers.current.forEach((timer) => clearTimeout(timer));
      saveTimers.current.clear();
    },
    [],
  );

  return (
    <section className="surface-card p-4 sm:p-5" aria-labelledby="passport-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Product truth</p>
          <h2 id="passport-heading" className="mt-1 text-xl font-semibold tracking-tight">
            {passport.name}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {passport.description}
          </p>
        </div>
      </div>
      <div className="mt-4 grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
          const expanded = expandedFeatureKeys.includes(definition.key);
          const inputId = `product-feature-${definition.key}`;
          const detailId = `${inputId}-details`;
          const hasOverflowingContent = overflowingFeatureKeys.includes(
            definition.key,
          );
          const saving = savingFeatureKeys.includes(definition.key);
          const saved = savedFeatureKeys.includes(definition.key);

          return (
            <div
              key={definition.key}
              className={`${expanded ? "min-h-[210px]" : hasOverflowingContent ? "h-[210px] overflow-hidden" : "h-[184px] overflow-hidden"} rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 ${
                changedFeatureKeys.includes(definition.key) ? "changed-feature" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--ink)]">{definition.label}</p>
                <EvidenceBadge status={feature.status} />
              </div>
              <p
                ref={(element) => {
                  if (element) previewRefs.current.set(definition.key, element);
                  else previewRefs.current.delete(definition.key);
                }}
                className={`mt-2 text-sm leading-5 text-[var(--muted)] ${
                  expanded ? "" : "feature-value-preview"
                }`}
              >
                {displayValue(feature.value)}
                {feature.value !== null && feature.unit ? ` ${feature.unit}` : ""}
              </p>
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
                className="mt-2 min-h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs text-[var(--ink)]"
                placeholder={`Enter ${definition.label.toLowerCase()}`}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveFeature(definition.key)}
                  className="button-primary min-h-9 px-2.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-70"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <span className="text-sm text-[var(--verified)]" aria-live="polite">
                  {saved ? "Saved" : ""}
                </span>
              </div>
              {saveError && <p role="alert" className="mt-2 text-xs text-[var(--missing)]">{saveError}</p>}
              {hasOverflowingContent && (
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
              {hasOverflowingContent && expanded && (
                <div id={detailId} className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                  <p>Status: {feature.status.replace("_", " ")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
