"use client";

import { useState } from "react";
import type { RecommendationResult } from "@/domain/recommendation";
import { ClientApiError, readApiData } from "@/lib/client-api";
import { makeMockRecommendation } from "./mock-dashboard-data";

function Result({
  title,
  result,
}: {
  title: string;
  result: RecommendationResult;
}) {
  const candidate = result.candidates[0];
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-3xl font-bold text-slate-950">
        {candidate?.eligible ? "Eligible" : "Insufficient evidence"}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Rank</dt>
          <dd className="font-semibold">{candidate?.rank ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Fit score</dt>
          <dd className="font-semibold">{candidate?.fitScore ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm font-semibold">Matched facts</p>
      <p className="mt-1 text-sm text-slate-600">
        {candidate?.matchedFacts.join(", ") || "None"}
      </p>
      <p className="mt-4 text-sm font-semibold">Missing or failed</p>
      <p className="mt-1 text-sm text-slate-600">
        {candidate
          ? [...candidate.failedConstraints, ...candidate.missingEvidence].join(
              ", ",
            ) || "None"
          : "No product result"}
      </p>
    </article>
  );
}

export function BeforeAfterPanel({
  productId,
  offlineDemo,
}: {
  productId: string;
  offlineDemo: boolean;
}) {
  const [query, setQuery] = useState(
    "I am training for a half marathon in Singapore's humid weather and need lightweight road shoes under S$200.",
  );
  const [results, setResults] = useState<{
    before: RecommendationResult;
    after: RecommendationResult;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      if (offlineDemo) {
        setResults({
          before: makeMockRecommendation(query, false),
          after: makeMockRecommendation(query, true),
        });
        return;
      }

      const response = await fetch(`/api/products/${productId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await readApiData<{
        before?: RecommendationResult;
        after?: RecommendationResult;
      }>(response, "We could not run this comparison.");
      if (!data.before || !data.after) {
        throw new ClientApiError(
          "The comparison response was missing required data.",
        );
      }
      setResults({ before: data.before, after: data.after });
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
    <section className="surface-card p-5" aria-labelledby="proof-heading">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
        Recommendation proof
      </p>
      <h2 id="proof-heading" className="mt-1 text-xl font-semibold">
        Run the same shopper query
      </h2>
      <label className="mt-4 block text-sm font-semibold">
        Buyer query
        <textarea
          aria-label="Buyer query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3"
        />
      </label>
      <button
        type="button"
        onClick={() => void compare()}
        disabled={loading}
        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Comparing…" : "Compare recommendations"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {results && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Result title="Before" result={results.before} />
          <Result title="After" result={results.after} />
        </div>
      )}
    </section>
  );
}
