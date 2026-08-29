"use client";

import { useEffect, useState } from "react";
import type { Gap, ListingEvaluation } from "@/domain/evaluation";
import type { ProductPassport } from "@/domain/passport";
import { ClientApiError, readApiData } from "@/lib/client-api";
import { BeforeAfterPanel } from "./before-after-panel";
import { GapList } from "./gap-list";
import { MarketInsights } from "./market-insights";
import { makeMockDashboard } from "./mock-dashboard-data";
import { ProductPassportPanel } from "./product-passport-panel";
import { ImplementationPatch } from "./implementation-patch";
import { ReadinessBreakdown } from "./readiness-breakdown";
import { SellerChat, type SellerAnswer } from "./seller-chat";

type DashboardData = ReturnType<typeof makeMockDashboard>;
type ReleaseState = "loading" | "ready" | "offline" | "error";
type ProductResponse = {
  passport?: ProductPassport | null;
  evaluation?: ListingEvaluation | null;
};

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export function ProductDashboard({
  productId,
  offlineDemo = process.env.NEXT_PUBLIC_OFFLINE_DEMO === "true",
}: {
  productId: string;
  offlineDemo?: boolean;
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(() =>
    offlineDemo ? makeMockDashboard(productId) : null,
  );
  const [releaseState, setReleaseState] = useState<ReleaseState>(
    offlineDemo ? "offline" : "loading",
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachStarting, setCoachStarting] = useState(false);
  const [changed, setChanged] = useState<string[]>([]);
  const [nextGap, setNextGap] = useState<Gap | null | undefined>(undefined);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (offlineDemo) {
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      setReleaseState("loading");
      setDashboard(null);
      setCoachOpen(false);
      setNextGap(undefined);
      setApiError(null);

      try {
        const productResponse = await fetch(`/api/products/${productId}`);
        const product = await readApiData<ProductResponse>(
          productResponse,
          "We could not load this product.",
        );
        if (!product.passport) {
          throw new ClientApiError("This product does not have a passport.");
        }

        const evaluationResponse = await fetch(
          `/api/products/${productId}/evaluate`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          },
        );
        const evaluationData = await readApiData<{
          evaluation?: DashboardData["evaluation"];
          intelligence?: DashboardData["intelligence"];
        }>(evaluationResponse, "We could not evaluate this listing.");
        if (!evaluationData.evaluation || !evaluationData.intelligence) {
          throw new ClientApiError(
            "The evaluation response was missing required data.",
          );
        }
        if (cancelled) return;

        setDashboard({
          passport: product.passport,
          evaluation: evaluationData.evaluation,
          intelligence: evaluationData.intelligence,
          sessionId: null,
        });
        setReleaseState("ready");
      } catch (reason) {
        if (cancelled) return;
        setApiError(errorMessage(reason, "We could not load this product."));
        setReleaseState("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, offlineDemo, productId]);

  const openCoach = async () => {
    if (!dashboard || releaseState === "loading" || releaseState === "error") {
      return;
    }
    setApiError(null);

    if (releaseState === "offline" || dashboard.sessionId) {
      setCoachOpen(true);
      return;
    }

    setCoachStarting(true);
    try {
      const response = await fetch(`/api/products/${productId}/interviews`, {
        method: "POST",
      });
      const data = await readApiData<{
        session?: { id?: string };
        nextGap?: Gap | null;
      }>(response, "We could not start the seller coach.");
      if (!data.session?.id) {
        throw new ClientApiError(
          "The seller coach response did not include a session.",
        );
      }

      setDashboard((current) =>
        current ? { ...current, sessionId: data.session?.id ?? null } : current,
      );
      setNextGap(data.nextGap);
      setCoachOpen(true);
    } catch (reason) {
      setApiError(
        errorMessage(reason, "We could not start the seller coach."),
      );
    } finally {
      setCoachStarting(false);
    }
  };

  const applyMockAnswer = (answer: SellerAnswer) => {
    if (!dashboard) return;
    const nextFeatures = dashboard.passport.features.map((item) =>
      item.key !== answer.featureKey
        ? item
        : {
            ...item,
            value: answer.value,
            unit: answer.unit,
            status: answer.unknown
              ? ("missing" as const)
              : answer.evidenceText
                ? ("verified" as const)
                : ("seller_declared" as const),
            confidence: answer.unknown ? 0 : answer.evidenceText ? 1 : 0.6,
          },
    );
    const nextGaps = answer.unknown
      ? dashboard.evaluation.gaps
      : dashboard.evaluation.gaps.filter(
          (gap) => gap.featureKey !== answer.featureKey,
        );
    const improvement = answer.unknown ? 0 : 14;
    const nextEvaluation: ListingEvaluation = {
      ...dashboard.evaluation,
      readiness: {
        ...dashboard.evaluation.readiness,
        completeness: Math.min(
          100,
          dashboard.evaluation.readiness.completeness + improvement,
        ),
        evidenceQuality: Math.min(
          100,
          dashboard.evaluation.readiness.evidenceQuality + improvement,
        ),
        intentCoverage: Math.min(
          100,
          dashboard.evaluation.readiness.intentCoverage + improvement,
        ),
        total: Math.min(
          100,
          dashboard.evaluation.readiness.total + improvement,
        ),
      },
      competitiveness: {
        ...dashboard.evaluation.competitiveness,
        peerFeatureCoverage: Math.min(
          100,
          dashboard.evaluation.competitiveness.peerFeatureCoverage +
            improvement,
        ),
        highDemandQueryCoverage: Math.min(
          100,
          dashboard.evaluation.competitiveness.highDemandQueryCoverage +
            improvement,
        ),
        total: Math.min(
          100,
          dashboard.evaluation.competitiveness.total + improvement,
        ),
      },
      gaps: nextGaps,
      generatedAt: new Date().toISOString(),
    };

    setDashboard((current) =>
      current
        ? {
            ...current,
            passport: {
              ...current.passport,
              features: nextFeatures,
              updatedAt: new Date().toISOString(),
            },
            evaluation: nextEvaluation,
            sessionId: current.sessionId ?? "mock-session-1",
          }
        : current,
    );
    setNextGap(nextGaps[0] ?? null);
    setChanged([answer.featureKey]);
  };

  const applyAnswer = async (answer: SellerAnswer) => {
    if (!dashboard) return;
    if (releaseState === "offline") {
      applyMockAnswer(answer);
      return;
    }
    if (!dashboard.sessionId) {
      throw new ClientApiError("The seller coach has not started.");
    }

    const response = await fetch(
      `/api/interviews/${dashboard.sessionId}/answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answer),
      },
    );
    const data = await readApiData<{
      passport?: ProductPassport;
      evaluation?: ListingEvaluation;
      nextGap?: Gap | null;
    }>(response, "We could not save that answer.");
    if (!data.passport || !data.evaluation) {
      throw new ClientApiError(
        "The saved answer response was missing required data.",
      );
    }

    setDashboard((current) =>
      current
        ? {
            ...current,
            passport: data.passport ?? current.passport,
            evaluation: data.evaluation ?? current.evaluation,
          }
        : current,
    );
    setNextGap(data.nextGap);
    setChanged([answer.featureKey]);
  };

  if (releaseState === "loading") {
    return (
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section
          role="status"
          className="surface-card mx-auto max-w-2xl border-[var(--ink)] p-8 text-center"
        >
          <p className="eyebrow">
            Product workspace
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink)]">
            Analysing listing…
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            Building the Product Passport and recommendation readiness score.
          </p>
        </section>
      </main>
    );
  }

  if (releaseState === "error" || !dashboard) {
    return (
      <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <section className="surface-card border-[var(--ink)] p-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
            We could not open this product
          </h1>
          <p
            role="alert"
            className="mt-5 rounded-xl border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]"
          >
            {apiError ?? "We could not load this product."}
          </p>
          <button
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="button-primary mt-5 min-h-11 px-4 py-2 font-semibold"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  const activeGap = coachOpen
    ? nextGap === undefined
      ? (dashboard.evaluation.gaps[0] ?? null)
      : nextGap
    : null;
  const activeDefinition = dashboard.intelligence.features.find(
    (feature) => feature.key === activeGap?.featureKey,
  );
  const coachLabel = coachStarting ? "Starting coach…" : "Open seller coach";
  const coachButton = (
    <button
      onClick={() => void openCoach()}
      disabled={coachStarting}
      className="button-primary min-h-12 px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    >
      {coachLabel}
    </button>
  );

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            AgentReady Coach / Product workspace
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
            Make product truth recommendation-ready
          </h1>
        </div>
        {coachButton}
      </header>
      {releaseState === "offline" && (
        <p className="mb-5 rounded-xl border border-[#95651c] bg-[#fff9e8] p-4 text-sm text-[#765018]">
          Offline demo mode uses local sample data. Live API changes are not
          saved.
        </p>
      )}
      {apiError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]"
        >
          {apiError}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="order-1 lg:col-span-2">
          {coachOpen ? (
            <SellerChat
              sessionId={dashboard.sessionId}
              gap={activeGap}
              definition={activeDefinition}
              onUpdate={applyAnswer}
            />
          ) : (
            <section className="surface-card dark-surface p-5 sm:p-6">
              <p className="eyebrow text-white/65">
                Guided optimisation
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Let the coach find your next best answer
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Prioritised questions connect missing product facts to real
                shopper demand.
              </p>
              <button
                onClick={() => void openCoach()}
                disabled={coachStarting}
                className="mt-5 min-h-11 rounded-lg bg-white px-4 py-2 font-semibold text-[var(--ink)] transition-opacity duration-100 hover:opacity-85 disabled:opacity-50"
              >
                {coachLabel}
              </button>
            </section>
          )}
        </div>
        <div className="order-2 lg:col-span-2">
          <ProductPassportPanel
            passport={dashboard.passport}
            definitions={dashboard.intelligence.features}
            changedFeatureKeys={changed}
          />
        </div>
        <aside className="order-3 space-y-5 lg:col-span-1">
          <ReadinessBreakdown
            readiness={dashboard.evaluation.readiness}
            competitiveness={dashboard.evaluation.competitiveness}
          />
        </aside>
        <div className="order-4 space-y-5 lg:col-span-2">
          <GapList gaps={dashboard.evaluation.gaps} />
        </div>
        <div className="order-5 space-y-5 lg:col-span-3">
          <MarketInsights intelligence={dashboard.intelligence} />
        </div>
      </div>
      <div className="mt-5">
        <ImplementationPatch productId={productId} offlineDemo={releaseState === "offline"} />
      </div>
      <div className="mt-5">
        <BeforeAfterPanel
          productId={productId}
          offlineDemo={releaseState === "offline"}
        />
      </div>
    </main>
  );
}
