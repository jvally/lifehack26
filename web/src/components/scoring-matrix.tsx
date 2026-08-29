import type { ScoreBreakdown } from "@/domain/evaluation";

const rows: Array<{ key: Exclude<keyof ScoreBreakdown, "total">; label: string; weight: string; purpose: string }> = [
  { key: "completeness", label: "Product facts", weight: "30%", purpose: "Are the attributes AI shoppers need present?" },
  { key: "intentCoverage", label: "Shopper intent", weight: "25%", purpose: "Can the listing answer common category-specific requests?" },
  { key: "evidenceQuality", label: "Evidence", weight: "20%", purpose: "Are important claims verified or supported?" },
  { key: "discoverability", label: "Search language", weight: "15%", purpose: "Does the description use the terms shoppers search for?" },
  { key: "consistency", label: "Consistency", weight: "10%", purpose: "Are price, claims, and structured facts coherent?" },
];

export function ScoringMatrix({ readiness }: { readiness: ScoreBreakdown }) {
  return <div className="mt-7 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas)]" data-testid="scoring-matrix">
    <div className="grid grid-cols-[1fr_4rem_3rem] gap-3 bg-[var(--cream-dark)] px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]"><span>AI recommendation score</span><span>Weight</span><span>Score</span></div>
    {rows.map((row) => <div key={row.key} className="grid grid-cols-[1fr_4rem_3rem] gap-3 border-t border-[var(--border)] px-3 py-3 text-xs"><div><p className="font-semibold text-[var(--ink)]">{row.label}</p><p className="mt-1 leading-5 text-[var(--muted)]">{row.purpose}</p></div><span className="text-[var(--muted)]">{row.weight}</span><span className="font-bold text-[var(--ink)]">{Math.round(readiness[row.key])}</span></div>)}
  </div>;
}
