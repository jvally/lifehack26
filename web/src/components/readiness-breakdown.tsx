import type { CompetitivenessBreakdown, ScoreBreakdown } from "@/domain/evaluation";
import { ScoringMatrix } from "./scoring-matrix";

const labels: Record<Exclude<keyof ScoreBreakdown, "total">, string> = { completeness: "Completeness", intentCoverage: "Intent coverage", evidenceQuality: "Evidence quality", discoverability: "Discoverability", consistency: "Consistency & freshness" };

export function ReadinessBreakdown({ readiness, competitiveness }: { readiness: ScoreBreakdown; competitiveness: CompetitivenessBreakdown }) {
  return <section className="surface-card p-5" aria-labelledby="readiness-heading">
    <p className="eyebrow">Listing health</p>
    <h2 id="readiness-heading" className="mt-2 text-2xl font-semibold tracking-tight">AI Readiness</h2>
    <div className="my-7 flex items-center gap-4"><div data-testid="readiness-total" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-[var(--ink)] text-3xl font-bold text-[var(--ink)]">{Math.round(readiness.total)}</div><p className="text-sm leading-6 text-[var(--muted)]">How completely and credibly this listing can answer AI shoppers.</p></div>
    <div className="space-y-4">{(Object.keys(labels) as Array<Exclude<keyof ScoreBreakdown, "total">>).map((key) => <div key={key}><div className="mb-1 flex justify-between text-xs font-medium text-[var(--muted)]"><span>{labels[key]}</span><span className="mono-label">{Math.round(readiness[key])}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--cream-dark)]"><div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${readiness[key]}%` }} /></div></div>)}</div>
    <ScoringMatrix readiness={readiness} />
    <div className="mt-7 border-t border-[var(--border)] pt-5"><p className="eyebrow">Peer benchmark</p><p className="mt-2 text-4xl font-bold tracking-tight">{Math.round(competitiveness.total)}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Competitiveness is a benchmark, not a predicted marketplace rank.</p></div>
  </section>;
}
