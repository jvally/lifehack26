import type { FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { EvidenceBadge } from "./evidence-badge";

function displayValue(value: ProductPassport["features"][number]["value"]) { return Array.isArray(value) ? value.join(", ") : value === null ? "Not supplied" : String(value); }

export function ProductPassportPanel({ passport, definitions, changedFeatureKeys = [] }: { passport: ProductPassport; definitions: FeatureDefinition[]; changedFeatureKeys?: string[] }) {
  const byKey = new Map(passport.features.map((feature) => [feature.key, feature]));
  return <section className="surface-card p-5" aria-labelledby="passport-heading"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Product truth</p><h2 id="passport-heading" className="mt-1 text-xl font-semibold">{passport.name}</h2><p className="mt-1 text-sm text-slate-600">{passport.description}</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">{passport.currency} {passport.price}</span></div><div className="mt-6 space-y-2">{definitions.map((definition) => { const feature = byKey.get(definition.key) ?? { key: definition.key, label: definition.label, value: null, unit: definition.unit, status: "missing" as const, confidence: 0, evidenceIds: [] }; return <div key={definition.key} className={`rounded-xl border border-slate-200 p-3 ${changedFeatureKeys.includes(definition.key) ? "changed-feature" : ""}`}><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900">{definition.label}</p><EvidenceBadge status={feature.status} /></div><p className="mt-1 text-sm text-slate-600">{displayValue(feature.value)}{feature.value !== null && feature.unit ? ` ${feature.unit}` : ""}</p></div>; })}</div></section>;
}
