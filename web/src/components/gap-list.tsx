import type { Gap } from "@/domain/evaluation";

export function GapList({ gaps }: { gaps: Gap[] }) {
  return <section className="surface-card p-5" aria-labelledby="gaps-heading"><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Highest-impact actions</p><h2 id="gaps-heading" className="mt-1 text-xl font-semibold">Close the gaps</h2><ul className="mt-4 space-y-3">{gaps.map((gap) => <li key={gap.featureKey} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium">{gap.label}</span><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{Math.round(gap.priority)} priority</span></div><p className="mt-2 text-sm text-slate-600">{gap.question}</p><p className="mt-2 text-xs font-medium text-slate-500">{gap.reason.replace("_", " ")}{gap.evidenceRequested ? " · Evidence requested" : ""}</p></li>)}</ul></section>;
}
