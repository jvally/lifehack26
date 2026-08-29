"use client";

import { useMemo, useState } from "react";
import type { Gap, ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence, FeatureDefinition } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { applySellerAnswer } from "@/features/interviews/answer-application";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { approveMockBrandProduct } from "@/lib/mock-brand-database";
import { readApiData } from "@/lib/client-api";

type DraftAnswer = {
  gap: Gap;
  definition: FeatureDefinition;
  value: string;
  evidenceText: string;
};

type ApprovedUpdate = {
  passport: ProductPassport;
  evaluation: ListingEvaluation;
  changedFeatureKeys: string[];
};

function answerValue(answer: DraftAnswer): string | number {
  return answer.definition.dataType === "number"
    ? Number(answer.value)
    : answer.value.trim();
}

export function SellerCoach({
  productId,
  passport,
  evaluation,
  intelligence,
  offlineDemo,
  onApproved,
}: {
  productId: string;
  passport: ProductPassport;
  evaluation: ListingEvaluation;
  intelligence: CategoryIntelligence;
  offlineDemo: boolean;
  onApproved: (update: ApprovedUpdate) => void;
}) {
  const coachableGaps = useMemo(
    () =>
      evaluation.gaps.flatMap((gap) => {
        const definition = intelligence.features.find(
          (feature) => feature.key === gap.featureKey,
        );
        return definition ? [{ gap, definition }] : [];
      }),
    [evaluation.gaps, intelligence.features],
  );
  const [open, setOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [value, setValue] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [drafts, setDrafts] = useState<DraftAnswer[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = coachableGaps[questionIndex];

  const stageAnswer = () => {
    if (!current || !value.trim()) {
      setError("Add an answer before continuing.");
      return;
    }
    if (current.definition.dataType === "number" && !Number.isFinite(Number(value))) {
      setError("Enter a valid number.");
      return;
    }
    const nextDrafts = [
      ...drafts.filter((draft) => draft.gap.featureKey !== current.gap.featureKey),
      { ...current, value, evidenceText },
    ];
    setDrafts(nextDrafts);
    setValue("");
    setEvidenceText("");
    setError(null);
    if (questionIndex < coachableGaps.length - 1) setQuestionIndex((index) => index + 1);
    else setReviewing(true);
  };

  const approve = async () => {
    setSaving(true);
    setError(null);
    try {
      let nextPassport = passport;
      let nextEvaluation = evaluation;

      if (offlineDemo) {
        for (const draft of drafts) {
          const verified = Boolean(draft.evidenceText.trim());
          nextPassport = applySellerAnswer(
            nextPassport,
            {
              featureKey: draft.gap.featureKey,
              label: draft.gap.label,
              value: answerValue(draft),
              unit: draft.definition.unit,
              unknown: false,
              evidenceId: verified ? `mock-evidence-${draft.gap.featureKey}` : null,
            },
            { supported: verified },
          );
        }
        nextEvaluation = evaluateListing(nextPassport, intelligence);
        approveMockBrandProduct(productId, nextPassport);
      } else {
        const interviewResponse = await fetch(`/api/products/${productId}/interviews`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const interview = await readApiData<{ session?: { id: string } }>(
          interviewResponse,
          "We could not start the seller review.",
        );
        if (!interview.session?.id) throw new Error("The seller review did not return a session.");

        for (const draft of drafts) {
          const response = await fetch(`/api/interviews/${interview.session.id}/answers`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              featureKey: draft.gap.featureKey,
              label: draft.gap.label,
              value: answerValue(draft),
              unit: draft.definition.unit,
              unknown: false,
              evidenceId: null,
              evidenceText: draft.evidenceText.trim() || null,
            }),
          });
          const update = await readApiData<{
            passport?: ProductPassport;
            evaluation?: ListingEvaluation;
          }>(response, "We could not save the approved catalog changes.");
          if (!update.passport || !update.evaluation) {
            throw new Error("The saved catalog record was incomplete.");
          }
          nextPassport = update.passport;
          nextEvaluation = update.evaluation;
        }
      }

      onApproved({
        passport: nextPassport,
        evaluation: nextEvaluation,
        changedFeatureKeys: drafts.map((draft) => draft.gap.featureKey),
      });
      setSaved(true);
      setReviewing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save the changes.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <section className="surface-card border-[var(--verified)] p-5 sm:p-6" aria-label="Catalog update saved">
        <p className="eyebrow text-[var(--verified)]">Mock brand database updated</p>
        <h2 className="mt-2 text-2xl font-semibold">Approved catalog record saved</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {drafts.length} field{drafts.length === 1 ? "" : "s"} now appear in the product record. Run the buyer query below to verify eligibility.
        </p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="dark-surface surface-card p-5 sm:p-6" aria-labelledby="coach-heading">
        <p className="eyebrow">RetailReady coach</p>
        <h2 id="coach-heading" className="mt-2 text-2xl font-semibold">Close the fields blocking eligibility</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          RetailReady found {coachableGaps.length} high-impact catalog gaps. Answer the coach, review the proposal, then approve the database update.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="button-secondary mt-5 min-h-11 px-4 py-2 font-semibold">
          Open seller coach
        </button>
      </section>
    );
  }

  if (reviewing) {
    return (
      <section className="surface-card border-[var(--ink)] p-5 sm:p-6" aria-labelledby="proposal-heading">
        <p className="eyebrow">Proposed catalog changes</p>
        <h2 id="proposal-heading" className="mt-2 text-2xl font-semibold">Review before anything is saved</h2>
        <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)]">
          {drafts.map((draft) => (
            <div key={draft.gap.featureKey} className="grid gap-1 border-b border-[var(--border)] p-4 last:border-b-0 sm:grid-cols-[1fr_1.5fr]">
              <span className="text-sm font-semibold">{draft.gap.label}</span>
              <span className="text-sm text-[var(--muted)]">Not supplied → <strong className="text-[var(--ink)]">{draft.value}{draft.definition.unit ? ` ${draft.definition.unit}` : ""}</strong></span>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-[var(--missing)] bg-[#fff5f2] p-3 text-sm text-[var(--missing)]">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void approve()} disabled={saving} className="button-primary min-h-11 px-5 py-2 font-semibold disabled:opacity-50">
            {saving ? "Saving approved changes…" : "Approve and save"}
          </button>
          <button type="button" onClick={() => setReviewing(false)} disabled={saving} className="button-secondary min-h-11 px-4 py-2 font-semibold">
            Back to coach
          </button>
        </div>
      </section>
    );
  }

  if (!current) {
    return <section className="surface-card p-5">No unanswered eligibility gaps remain.</section>;
  }

  return (
    <section className="dark-surface surface-card p-5 sm:p-6" aria-label="RetailReady seller coach">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Interactive coaching</p>
        <span className="mono-label text-white/60">{questionIndex + 1} / {coachableGaps.length}</span>
      </div>
      <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight">{current.gap.question}</h2>
      <p className="mt-3 text-sm text-white/65">Priority {current.gap.priority}/100 · This answer improves buyer constraint matching.</p>
      <label className="mt-5 block text-sm font-semibold">
        Your answer{current.definition.unit ? ` (${current.definition.unit})` : ""}
        <input
          aria-label="Your answer"
          inputMode={current.definition.dataType === "number" ? "decimal" : "text"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border px-3"
        />
      </label>
      {current.gap.evidenceRequested && (
        <label className="mt-4 block text-sm font-semibold">
          Supporting evidence <span className="font-normal text-white/60">(optional)</span>
          <textarea
            aria-label="Supporting evidence"
            value={evidenceText}
            onChange={(event) => setEvidenceText(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-lg border p-3"
            placeholder="Paste a specification-sheet excerpt or test result"
          />
        </label>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-[#ffb4aa]">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={stageAnswer} className="rounded-lg bg-white px-5 py-2 font-semibold text-[var(--ink)]">
          {questionIndex === coachableGaps.length - 1 ? "Review proposal" : "Save answer"}
        </button>
        {drafts.length > 0 && (
          <button type="button" onClick={() => setReviewing(true)} className="button-secondary px-4 py-2 font-semibold">
            Review {drafts.length} proposed change{drafts.length === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </section>
  );
}
