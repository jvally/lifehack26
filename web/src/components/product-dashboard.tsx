"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ListingEvaluation } from "@/domain/evaluation";
import type { ProductPassport } from "@/domain/passport";
import { ClientApiError, readApiData } from "@/lib/client-api";
import { buildVisibilityReport } from "@/features/visibility/build-visibility-report";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import type { AttributionEvent } from "@/domain/attribution";
import { AttributionPanel } from "./attribution-panel";
import { BeforeAfterPanel } from "./before-after-panel";
import { GapList } from "./gap-list";
import { ImplementationPatch } from "./implementation-patch";
import { MarketInsights } from "./market-insights";
import { makeMockDashboard } from "./mock-dashboard-data";
import { ProductPassportPanel } from "./product-passport-panel";
import { ReadinessBreakdown } from "./readiness-breakdown";
import { SellerCoach } from "./seller-coach";
import { VisibilityTracker } from "./visibility-tracker";
import { getMockBrandProduct } from "@/lib/mock-brand-database";

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
  const [attribution, setAttribution] = useState<AttributionEvent | null>(null);
  const [approved, setApproved] = useState(() =>
    offlineDemo ? getInitialOfflineDashboard(productId).approved : false,
  );
  const [changedFeatureKeys, setChangedFeatureKeys] = useState<string[]>([]);

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
        <div className="order-1 lg:col-span-4">
          <ProductPassportPanel
            passport={dashboard.passport}
            definitions={dashboard.intelligence.features}
            changedFeatureKeys={changedFeatureKeys}
          />
        </div>
        <aside className="order-2 space-y-5 lg:col-span-1">
          <ReadinessBreakdown
            readiness={dashboard.evaluation.readiness}
            competitiveness={dashboard.evaluation.competitiveness}
          />
        </aside>
        <div className="order-3 space-y-5 lg:col-span-2">
          <GapList gaps={dashboard.evaluation.gaps} />
        </div>
        <div className="order-4 space-y-5 lg:col-span-3">
          <MarketInsights intelligence={dashboard.intelligence} />
        </div>
      </div>
      <div className="mt-5">
        <SellerCoach
          productId={productId}
          passport={dashboard.passport}
          evaluation={dashboard.evaluation}
          intelligence={dashboard.intelligence}
          offlineDemo={releaseState === "offline"}
          onApproved={(update) => {
            setDashboard((current) =>
              current
                ? {
                    ...current,
                    passport: update.passport,
                    evaluation: update.evaluation,
                  }
                : current,
            );
            setChangedFeatureKeys(update.changedFeatureKeys);
            setApproved(true);
          }}
        />
      </div>
      <div className="mt-5">
        <VisibilityTracker fallback={buildVisibilityReport(dashboard.evaluation, dashboard.intelligence, [])} />
      </div>
      <div className="mt-5">
        <ImplementationPatch productId={productId} offlineDemo={releaseState === "offline"} />
      </div>
      <div className="mt-5">
        <BeforeAfterPanel
          productId={productId}
          offlineDemo={releaseState === "offline"}
          approved={approved}
          onCompared={setAttribution}
        />
      </div>
      <div className="mt-5">
        <AttributionPanel productId={productId} attribution={attribution} />
      </div>
    </main>
  );
}
