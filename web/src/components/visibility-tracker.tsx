import type { VisibilityReport } from "@/domain/visibility";

export function VisibilityTracker({ fallback }: {
  fallback: VisibilityReport;
}) {
  const report = fallback;

  return <section className="surface-card p-5" aria-labelledby="visibility-heading">
    <p className="text-xs font-bold uppercase tracking-widest text-blue-700">AI visibility tracker</p>
    <h2 id="visibility-heading" className="mt-1 text-xl font-semibold">Will agents surface this product?</h2>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <Metric label="Benchmark visibility" value={`${report.visibilityRate}%`} detail={`${report.visibleBenchmarkCount}/${report.benchmarkCount} shopper intents`} />
      <Metric label="Demand-weighted visibility" value={`${report.demandWeightedVisibility}%`} detail="Weighted by observed shopper demand" />
      <Metric label="Readiness vs peers" value={`${report.readinessLead >= 0 ? "+" : ""}${report.readinessLead}`} detail={`Peer readiness average ${report.averageCompetitorReadiness}`} />
    </div>
    {(report.missedIntents ?? []).length > 0 && <p className="mt-4 text-sm text-slate-600">Still not visible for: {report.missedIntents.slice(0, 3).join(", ")}.</p>}
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}
