"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ListingEvaluation } from "@/domain/evaluation";
import type { FeatureScalar, ProductPassport } from "@/domain/passport";
import { ClientApiError, readApiData } from "@/lib/client-api";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { GapList } from "./gap-list";
import { MarketInsights } from "./market-insights";
import { makeMockDashboard } from "./mock-dashboard-data";
import { ProductPassportPanel } from "./product-passport-panel";
import { ReadinessBreakdown } from "./readiness-breakdown";
import { SellerCoach } from "./seller-coach";
import { approveMockBrandProduct, getMockBrandProduct } from "@/lib/mock-brand-database";
import { applySellerAnswer } from "@/features/interviews/answer-application";

type DashboardData = ReturnType<typeof makeMockDashboard>;
type ReleaseState = "loading" | "ready" | "offline" | "error";
type ProductResponse = {
  passport?: ProductPassport | null;
  evaluation?: ListingEvaluation | null;
};

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

function getInitialOfflineDashboard(productId: string): {
  dashboard: DashboardData;
  approved: boolean;
} {
  const storedProduct = getMockBrandProduct(productId);
  const initial = makeMockDashboard(productId, storedProduct?.sourceListing);
  if (storedProduct?.passport) {
    return {
      dashboard: {
        ...initial,
        passport: storedProduct.passport,
        evaluation: evaluateListing(
          storedProduct.passport,
          initial.intelligence,
        ),
      },
      approved: storedProduct.status === "approved",
    };
  }
  return { dashboard: initial, approved: false };
}

export function ProductDashboard({
  productId,
  offlineDemo = process.env.NEXT_PUBLIC_OFFLINE_DEMO === "true",
}: {
  productId: string;
  offlineDemo?: boolean;
}) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(() =>
    offlineDemo ? getInitialOfflineDashboard(productId).dashboard : null,
  );
  const [releaseState, setReleaseState] = useState<ReleaseState>(
    offlineDemo ? "offline" : "loading",
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [changedFeatureKeys, setChangedFeatureKeys] = useState<string[]>([]);

  const saveFeature = async (featureKey: string, value: FeatureScalar) => {
    if (!dashboard) throw new Error("The product is still loading.");
    const definition = dashboard.intelligence.features.find(
      (feature) => feature.key === featureKey,
    );
    if (!definition) throw new Error("Unknown product specification.");

    if (offlineDemo) {
      const passport = applySellerAnswer(
        dashboard.passport,
        {
          featureKey,
          label: definition.label,
          value,
          unit: definition.unit,
          unknown: false,
          evidenceId: null,
        },
        { supported: false },
      );
      const evaluation = evaluateListing(passport, dashboard.intelligence);
      approveMockBrandProduct(productId, passport);
      setDashboard((current) =>
        current ? { ...current, passport, evaluation } : current,
      );
      setChangedFeatureKeys((current) => [...new Set([...current, featureKey])]);
      return;
    }

    const response = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        featureKey,
        label: definition.label,
        value,
        unit: definition.unit,
      }),
    });
    const update = await readApiData<{
      passport?: ProductPassport;
      evaluation?: ListingEvaluation;
    }>(response, "We could not save this specification.");
    if (!update.passport || !update.evaluation) {
      throw new ClientApiError("The saved product record was incomplete.");
    }
    setDashboard((current) =>
      current
        ? { ...current, passport: update.passport!, evaluation: update.evaluation! }
        : current,
    );
    setChangedFeatureKeys((current) => [...new Set([...current, featureKey])]);
  };

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

  if (releaseState === "loading") {
    return (
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section role="status" className="surface-card mx-auto max-w-2xl border-[var(--ink)] p-8 text-center">
          <p className="eyebrow">Product workspace</p>
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
          <p role="alert" className="mt-5 rounded-xl border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]">
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

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">RET-AI-L Ready / Product workspace</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
            Make product truth recommendation-ready
          </h1>
        </div>
        <Link
          href={`/catalog/${productId}`}
          className="button-secondary inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold"
        >
          View product in catalogue
        </Link>
      </header>
      {releaseState === "offline" && (
        <p className="mb-5 rounded-xl border border-[#95651c] bg-[#fff9e8] p-4 text-sm text-[#765018]">
          Offline demo mode uses local sample data. Live API changes are not saved.
        </p>
      )}
      {apiError && (
        <p role="alert" className="mb-5 rounded-xl border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]">
          {apiError}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="order-1 lg:col-span-5">
          <ProductPassportPanel
            passport={dashboard.passport}
            definitions={dashboard.intelligence.features}
            changedFeatureKeys={changedFeatureKeys}
            onSaveFeature={saveFeature}
          />
        </div>
        <aside className="order-2 lg:col-span-2">
          <ReadinessBreakdown
            readiness={dashboard.evaluation.readiness}
            competitiveness={dashboard.evaluation.competitiveness}
          />
        </aside>
        <div className="order-3 lg:col-span-3">
          <MarketInsights intelligence={dashboard.intelligence} />
        </div>
      </div>
      <div className="mt-5">
        <section aria-labelledby="highest-impact-heading" className="space-y-5">
          <div>
            <p className="eyebrow">Highest-impact actions</p>
            <h2 id="highest-impact-heading" className="mt-2 text-2xl font-semibold tracking-tight">Highest-impact actions</h2>
          </div>
          <GapList gaps={dashboard.evaluation.gaps} />
          <SellerCoach
            productId={productId}
            passport={dashboard.passport}
            evaluation={dashboard.evaluation}
            intelligence={dashboard.intelligence}
            offlineDemo={releaseState === "offline"}
            onApproved={(update) => {
              setDashboard((current) =>
                current
                  ? { ...current, passport: update.passport, evaluation: update.evaluation }
                  : current,
              );
              setChangedFeatureKeys(update.changedFeatureKeys);
            }}
          />
        </section>
      </div>
    </main>
  );
}
