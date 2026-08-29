"use client";

import { useState } from "react";
import type { RecommendationResult } from "@/domain/recommendation";
import { ClientApiError, readApiData } from "@/lib/client-api";
import { makeMockRecommendation } from "./mock-dashboard-data";
import { preferenceProfiles } from "@/domain/preference-profile";
import type { AttributionEvent } from "@/domain/attribution";

function Result({
  title,
  result,
  targetProductId,
}: {
  title: string;
  result: RecommendationResult;
  targetProductId: string;
}) {
  const candidate = result.candidates.find(
    (item) => item.productId === targetProductId,
  );
  const rankedCandidates = result.candidates
    .filter((item) => item.rank !== null)
    .sort((left, right) => (left.rank ?? Infinity) - (right.rank ?? Infinity));
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="mono-label text-[var(--muted)]">{title === "Before" ? "01" : "02"}</span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-[var(--ink)]">
        {candidate?.eligible ? "Eligible" : "Insufficient evidence"}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Target product: {candidate?.productName ?? targetProductId}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Rank</dt>
          <dd className="font-semibold">{candidate?.rank ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Fit score</dt>
          <dd className="font-semibold">{candidate?.fitScore ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm font-semibold">Matched facts</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        {candidate?.matchedFacts.join(", ") || "None"}
      </p>
      <p className="mt-4 text-sm font-semibold">Missing or failed</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        {candidate
          ? [...candidate.failedConstraints, ...candidate.missingEvidence].join(
              ", ",
            ) || "None"
          : "No product result"}
      </p>
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <p className="text-sm font-semibold">Ranked candidates</p>
        <ol className="mt-2 space-y-2 text-sm text-[var(--muted)]">
          {rankedCandidates.length === 0 ? (
            <li>No eligible candidates</li>
          ) : (
            rankedCandidates.slice(0, 5).map((item) => (
              <li
                key={item.productId}
                className={item.productId === targetProductId ? "font-semibold text-[var(--ink)]" : undefined}
              >
                {item.rank}. {item.productName} · {item.fitScore}
              </li>
            ))
          )}
        </ol>
      </div>
    </article>
  );
}

export function BeforeAfterPanel({
  productId,
  offlineDemo,
  approved = true,
  onCompared,
}: {
  productId: string;
  offlineDemo: boolean;
  approved?: boolean;
  onCompared?: (attribution: AttributionEvent | null) => void;
}) {
  const [query, setQuery] = useState(
    "I am training for a half marathon in Singapore's humid weather and need lightweight road shoes under S$200.",
  );
  const [results, setResults] = useState<{
    targetProductId: string;
    before: RecommendationResult;
    after: RecommendationResult;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState("balanced");

  const compare = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      if (offlineDemo) {
        setResults({
          targetProductId: productId,
          before: makeMockRecommendation(query, false),
          after: makeMockRecommendation(query, approved),
        });
        onCompared?.(null);
        return;
      }

      const response = await fetch(`/api/products/${productId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, profileId }),
      });
      const data = await readApiData<{
        targetProductId?: string;
        before?: RecommendationResult;
        after?: RecommendationResult;
        attribution?: AttributionEvent;
      }>(response, "We could not run this comparison.");
      if (!data.targetProductId || !data.before || !data.after) {
        throw new ClientApiError(
          "The comparison response was missing required data.",
        );
      }
      setResults({
        targetProductId: data.targetProductId,
        before: data.before,
        after: data.after,
      });
      onCompared?.(data.attribution ?? null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not run this comparison. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="proof-heading">
      <p className="eyebrow">
        Recommendation proof
      </p>
      <h2 id="proof-heading" className="mt-2 text-2xl font-semibold tracking-tight">
        Run the same shopper query
      </h2>
      <label className="mt-6 block text-sm font-semibold">
        Buyer query
        <textarea
          aria-label="Buyer query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-3 min-h-24 w-full rounded-lg border border-[var(--ink)] bg-[var(--canvas)] p-4 text-[var(--ink)] placeholder:text-[var(--muted)]"
        />
      </label>
      <label className="mt-3 block text-sm font-semibold">
        Shopper preference profile
        <select
          aria-label="Shopper preference profile"
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
        >
          {preferenceProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label} — {profile.description}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void compare()}
        disabled={loading}
        className="button-primary mt-4 min-h-11 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Comparing…" : "Compare recommendations"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]"
        >
          {error}
        </p>
      )}
      {results && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Result
            title="Before"
            result={results.before}
            targetProductId={results.targetProductId}
          />
          <Result
            title="After"
            result={results.after}
            targetProductId={results.targetProductId}
          />
        </div>
      )}
    </section>
  );
}
