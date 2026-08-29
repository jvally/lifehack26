"use client";

import { useState } from "react";
import type { Gap } from "@/domain/evaluation";
import type { FeatureDefinition } from "@/domain/market";

export type SellerAnswer = {
  featureKey: string;
  label: string;
  value: string | number | boolean | string[] | null;
  unit: string | null;
  unknown: boolean;
  evidenceId: string | null;
  evidenceText: string | null;
};

type SellerChatProps = {
  sessionId: string | null;
  gap: Gap | null;
  definition?: FeatureDefinition;
  onUpdate: (answer: SellerAnswer) => Promise<void> | void;
};

export function SellerChat(props: SellerChatProps) {
  return (
    <SellerChatForm
      key={props.gap?.featureKey ?? "complete"}
      {...props}
    />
  );
}

function SellerChatForm({
  sessionId,
  gap,
  definition,
  onUpdate,
}: SellerChatProps) {
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState(definition?.unit ?? "");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  if (!gap) {
    return (
      <section className="surface-card dark-surface p-5 sm:p-6">
        <p className="eyebrow text-white/65">
          Seller coach
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your listing is ready</h2>
        <p className="mt-3 text-sm text-white/70">
          No further high-impact questions remain.
        </p>
      </section>
    );
  }

  const submit = async (unknown = false) => {
    if (!unknown && !answer.trim()) {
      setError("Please provide an answer or select Unknown.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const parsed =
        definition?.dataType === "number" && !unknown
          ? Number(answer)
          : unknown
            ? null
            : answer;
      await onUpdate({
        featureKey: gap.featureKey,
        label: gap.label,
        value: parsed,
        unit: unit || null,
        unknown,
        evidenceId: null,
        evidenceText: evidence || null,
      });
      setNotice(`${gap.label} saved. Scores and Product Passport updated.`);
      setAnswer("");
      setEvidence("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not save that answer. Your response is still here. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const control =
    definition?.dataType === "boolean" ? (
      <select
        aria-label="Your answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/30 bg-white/8 p-3 text-white"
      >
        <option value="">Choose an answer</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    ) : (
      <input
        aria-label="Your answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        type={definition?.dataType === "number" ? "number" : "text"}
        className="mt-2 w-full rounded-lg border border-white/30 bg-white/8 p-3 text-white"
        placeholder={
          definition?.dataType === "number" ? "Enter a number" : "Type your answer"
        }
      />
    );

  return (
    <section
      className="surface-card dark-surface p-5 sm:p-6"
      aria-labelledby="coach-heading"
    >
      <p className="eyebrow text-white/65">
        Evidence-first seller coach
      </p>
      <h2 id="coach-heading" className="mt-2 text-2xl font-semibold tracking-tight">
        One answer, more coverage
      </h2>
      <p className="mt-5 text-sm leading-6 text-white/80">{gap.question}</p>
      <p className="mono-label mt-3 text-white/60">
        Priority {Math.round(gap.priority)} · {sessionId ? "Interview in progress" : "Offline demo session"}
      </p>
      <label className="mt-6 block text-sm font-semibold">
        Your answer
        {control}
      </label>
      {definition?.unit && (
        <label className="mt-3 block text-sm font-semibold">
          Unit
          <input
            aria-label="Unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/30 bg-white/8 p-3 text-white"
          />
        </label>
      )}
      {gap.evidenceRequested && (
        <label className="mt-3 block text-sm font-semibold">
          Supporting evidence
          <textarea
            aria-label="Supporting evidence"
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            className="mt-2 min-h-20 w-full rounded-lg border border-white/30 bg-white/8 p-3 text-white"
            placeholder="Paste a specification, test result, or source note"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ffb4a8]">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="min-h-11 rounded-lg bg-white px-4 py-2 font-semibold text-[var(--ink)] transition-opacity duration-100 hover:opacity-85 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save answer"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit(true)}
          className="button-secondary min-h-11 border-white/50 px-4 py-2 font-semibold text-white hover:border-white hover:bg-white hover:text-[var(--ink)] disabled:opacity-50"
        >
          Unknown
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {notice}
      </p>
    </section>
  );
}
