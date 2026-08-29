"use client";

import { useEffect, useMemo, useState } from "react";
import type { Gap, ListingEvaluation } from "@/domain/evaluation";
import type { ProductPassport } from "@/domain/passport";
import { BeforeAfterPanel } from "./before-after-panel";
import { GapList } from "./gap-list";
import { makeMockDashboard } from "./mock-dashboard-data";
import { MarketInsights } from "./market-insights";
import { ProductPassportPanel } from "./product-passport-panel";
import { ReadinessBreakdown } from "./readiness-breakdown";
import { SellerChat, type SellerAnswer } from "./seller-chat";

type DashboardState = ReturnType<typeof makeMockDashboard>;
type ApiError = { error?: { message?: string }; requestId?: string };
type ProductResponse = { passport?: ProductPassport | null; evaluation?: ListingEvaluation | null };

function apiMessage(body: ApiError, fallback: string) {
  return `${body.error?.message ?? fallback}${body.requestId ? ` Request ID: ${body.requestId}` : ""}`;
}

export function ProductDashboard({ productId }: { productId: string }) {
  const [dashboard, setDashboard] = useState<DashboardState>(() => makeMockDashboard(productId));
  const [coachOpen, setCoachOpen] = useState(false);
  const [changed, setChanged] = useState<string[]>([]);
  const [nextGap, setNextGap] = useState<Gap | null | undefined>(undefined);
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [analysisPending, setAnalysisPending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        const body = (await response.json()) as { data?: ProductResponse } & ApiError;
        if (!response.ok || !body.data?.passport || cancelled) return;
        setMode("live");
        setDashboard((current) => ({ ...current, passport: body.data?.passport ?? current.passport, evaluation: body.data?.evaluation ?? current.evaluation }));
        setAnalysisPending(true);
        const evaluated = await fetch(`/api/products/${productId}/evaluate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
        const evaluationBody = (await evaluated.json()) as { data?: { evaluation?: ListingEvaluation; intelligence?: DashboardState["intelligence"] } } & ApiError;
        if (cancelled) return;
        if (!evaluated.ok || !evaluationBody.data?.evaluation) { setApiError(apiMessage(evaluationBody, "We could not evaluate this listing.")); return; }
        setDashboard((current) => ({ ...current, evaluation: evaluationBody.data?.evaluation ?? current.evaluation, intelligence: evaluationBody.data?.intelligence ?? current.intelligence }));
      } catch {
        // The offline mock remains usable until the API is configured.
      } finally { if (!cancelled) setAnalysisPending(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [productId]);

  const activeGap = coachOpen ? nextGap === undefined ? dashboard.evaluation.gaps[0] ?? null : nextGap : null;
  const activeDefinition = useMemo(() => dashboard.intelligence.features.find((feature) => feature.key === activeGap?.featureKey), [dashboard.intelligence.features, activeGap?.featureKey]);

  const openCoach = async () => {
    setCoachOpen(true); setApiError(null);
    if (dashboard.sessionId || mode === "mock") return;
    try {
      const response = await fetch(`/api/products/${productId}/interviews`, { method: "POST" });
      const body = (await response.json()) as { data?: { session?: { id?: string }; nextGap?: Gap | null } } & ApiError;
      if (!response.ok || !body.data?.session?.id) { setApiError(apiMessage(body, "We could not start the seller coach.")); return; }
      setDashboard((current) => ({ ...current, sessionId: body.data?.session?.id ?? null }));
      setNextGap(body.data.nextGap);
    } catch { setApiError("We could not start the seller coach. Please try again."); }
  };

  const applyMockAnswer = (answer: SellerAnswer) => {
    const index = dashboard.evaluation.gaps.findIndex((gap) => gap.featureKey === answer.featureKey);
    const nextFeatures = dashboard.passport.features.map((item) => item.key !== answer.featureKey ? item : { ...item, value: answer.value, unit: answer.unit, status: answer.unknown ? "missing" as const : answer.evidenceText ? "verified" as const : "seller_declared" as const, confidence: answer.unknown ? 0 : answer.evidenceText ? 1 : 0.6 });
    const nextGaps = answer.unknown || index < 0 ? dashboard.evaluation.gaps : dashboard.evaluation.gaps.filter((gap) => gap.featureKey !== answer.featureKey);
    const improvement = answer.unknown ? 0 : 14;
    const nextEvaluation: ListingEvaluation = { ...dashboard.evaluation, readiness: { ...dashboard.evaluation.readiness, completeness: Math.min(100, dashboard.evaluation.readiness.completeness + improvement), evidenceQuality: Math.min(100, dashboard.evaluation.readiness.evidenceQuality + improvement), intentCoverage: Math.min(100, dashboard.evaluation.readiness.intentCoverage + improvement), total: Math.min(100, dashboard.evaluation.readiness.total + improvement) }, competitiveness: { ...dashboard.evaluation.competitiveness, peerFeatureCoverage: Math.min(100, dashboard.evaluation.competitiveness.peerFeatureCoverage + improvement), highDemandQueryCoverage: Math.min(100, dashboard.evaluation.competitiveness.highDemandQueryCoverage + improvement), total: Math.min(100, dashboard.evaluation.competitiveness.total + improvement) }, gaps: nextGaps, generatedAt: new Date().toISOString() };
    setDashboard((current) => ({ ...current, passport: { ...current.passport, features: nextFeatures, updatedAt: new Date().toISOString() }, evaluation: nextEvaluation, sessionId: current.sessionId ?? "mock-session-1" }));
    setNextGap(undefined); setChanged([answer.featureKey]);
  };

  const applyAnswer = async (answer: SellerAnswer) => {
    if (mode === "mock") { applyMockAnswer(answer); return; }
    if (!dashboard.sessionId) throw new Error("The seller coach has not started.");
    const response = await fetch(`/api/interviews/${dashboard.sessionId}/answers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(answer) });
    const body = (await response.json()) as { data?: { passport?: ProductPassport; evaluation?: ListingEvaluation; nextGap?: Gap | null } } & ApiError;
    if (!response.ok || !body.data?.passport || !body.data.evaluation) throw new Error(apiMessage(body, "We could not save that answer."));
    setDashboard((current) => ({ ...current, passport: body.data?.passport ?? current.passport, evaluation: body.data?.evaluation ?? current.evaluation }));
    setNextGap(body.data.nextGap); setChanged([answer.featureKey]);
  };

  const coachButton = <button onClick={() => void openCoach()} disabled={mode === "live" && analysisPending} className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{analysisPending ? "Analysing listing…" : "Open seller coach"}</button>;
  return <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">AgentReady Coach / Product workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Make product truth recommendation-ready</h1></div>{coachButton}</header>{apiError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{apiError}</p>}<div className="grid gap-5 lg:grid-cols-5"><div className="order-1 lg:col-span-2">{coachOpen ? <SellerChat sessionId={dashboard.sessionId} gap={activeGap} definition={activeDefinition} onUpdate={applyAnswer} /> : <section className="surface-card bg-[var(--navy)] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Guided optimisation</p><h2 className="mt-1 text-xl font-semibold">Let the coach find your next best answer</h2><p className="mt-3 text-sm text-slate-300">Prioritised questions connect missing product facts to real shopper demand.</p><button onClick={() => void openCoach()} disabled={mode === "live" && analysisPending} className="mt-4 rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">{analysisPending ? "Analysing listing…" : "Open seller coach"}</button></section>}</div><div className="order-2 lg:col-span-2"><ProductPassportPanel passport={dashboard.passport} definitions={dashboard.intelligence.features} changedFeatureKeys={changed} /></div><aside className="order-3 space-y-5 lg:col-span-1"><ReadinessBreakdown readiness={dashboard.evaluation.readiness} competitiveness={dashboard.evaluation.competitiveness} /></aside><div className="order-4 space-y-5 lg:col-span-2"><GapList gaps={dashboard.evaluation.gaps} /></div><div className="order-5 space-y-5 lg:col-span-3"><MarketInsights intelligence={dashboard.intelligence} /></div></div><div className="mt-5"><BeforeAfterPanel productId={productId} allowMockFallback={mode === "mock"} /></div></main>;
}
