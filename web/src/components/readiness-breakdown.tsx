import type { CompetitivenessBreakdown, ScoreBreakdown } from "@/domain/evaluation";
import { ScoringMatrix } from "./scoring-matrix";

const labels: Record<Exclude<keyof ScoreBreakdown, "total">, string> = { completeness: "Completeness", intentCoverage: "Intent coverage", evidenceQuality: "Evidence quality", discoverability: "Discoverability", consistency: "Consistency & freshness" };

export function ReadinessBreakdown({ readiness, competitiveness }: { readiness: ScoreBreakdown; competitiveness: CompetitivenessBreakdown }) {
  return <section className="surface-card p-5" aria-labelledby="readiness-heading">
    <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Listing health</p>
    <h2 id="readiness-heading" className="mt-1 text-xl font-semibold">AI Readiness</h2>
    <div className="my-5 flex items-center gap-4"><div data-testid="readiness-total" className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-blue-600 text-3xl font-bold text-slate-950">{Math.round(readiness.total)}</div><p className="text-sm leading-6 text-slate-600">How completely and credibly this listing can answer AI shoppers.</p></div>
    <div className="space-y-3">{(Object.keys(labels) as Array<Exclude<keyof ScoreBreakdown, "total">>).map((key) => <div key={key}><div className="mb-1 flex justify-between text-xs font-medium text-slate-600"><span>{labels[key]}</span><span>{Math.round(readiness[key])}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${readiness[key]}%` }} /></div></div>)}</div>
    <ScoringMatrix readiness={readiness} />
    <div className="mt-6 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Peer benchmark</p><p className="mt-1 text-3xl font-bold">{Math.round(competitiveness.total)}</p><p className="mt-1 text-xs text-slate-600">Competitiveness is a benchmark, not a predicted marketplace rank.</p></div>
  </section>;
}
