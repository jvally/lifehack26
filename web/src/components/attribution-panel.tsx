"use client";

import { useState } from "react";
import type { AttributionEvent } from "@/domain/attribution";
import { readApiData } from "@/lib/client-api";

export function AttributionPanel({ productId, attribution }: { productId: string; attribution: AttributionEvent | null }) {
  const [events, setEvents] = useState<AttributionEvent[]>(attribution ? [attribution] : []);
  const [notice, setNotice] = useState<string | null>(null);

  const recordView = async () => {
    if (!attribution) return;
    const response = await fetch(`/api/products/${productId}/attribution`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source: attribution.source, eventType: "product_view", referralToken: attribution.referralToken }) });
    const event = await readApiData<AttributionEvent>(response, "We could not record the referral event.");
    setEvents((current) => [event, ...current]);
    setNotice("Agent-driven product view recorded.");
  };

  return <section className="surface-card p-5" aria-labelledby="attribution-heading">
    <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Agent attribution</p>
    <h2 id="attribution-heading" className="mt-1 text-xl font-semibold">Measure agent-driven interest</h2>
    <p className="mt-2 text-sm text-slate-600">Each recommendation receives a referral token. Connect this event trail to a storefront to measure downstream conversions.</p>
    {attribution ? <div className="mt-4 flex flex-wrap items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">Source: {attribution.source.replaceAll("_", " ")}</span><button type="button" onClick={() => void recordView()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Record product view</button></div> : <p className="mt-4 text-sm text-slate-500">Run a recommendation comparison to create a trackable agent referral.</p>}
    {events.length > 0 && <p className="mt-3 text-xs text-slate-500">{events.length} tracked event{events.length === 1 ? "" : "s"} in this workspace session.</p>}
    {notice && <p role="status" className="mt-2 text-sm text-green-700">{notice}</p>}
  </section>;
}
