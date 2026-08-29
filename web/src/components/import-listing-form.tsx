"use client";

import { useState } from "react";
import { readApiData } from "@/lib/client-api";

type Format = "text" | "json" | "csv";
type Stage = "idle" | "importing" | "extracting";

export function ImportListingForm({
  onImported,
}: {
  onImported: (productId: string) => void;
}) {
  const [format, setFormat] = useState<Format>("text");
  const [content, setContent] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      setError("Add a product listing before analysing it.");
      return;
    }

    setError(null);
    setStage("importing");

    try {
      const imported = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, content }),
      });
      const importData = await readApiData<{ productIds: string[] }>(
        imported,
        "We could not import that listing.",
      );
      const productId = importData.productIds[0];
      if (!productId) throw new Error("The import did not return a product.");

      setStage("extracting");
      const extracted = await fetch(`/api/products/${productId}/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await readApiData(extracted, "We could not analyse that listing.");
      onImported(productId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setStage("idle");
    }
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="surface-card mx-auto max-w-4xl border-[var(--ink)] p-6 sm:p-10"
    >
      <p className="eyebrow">
        Start with product truth
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl">
        Analyse a product listing
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
        Import the source listing. RET-AI-L Ready will identify the facts an
        AI shopper still cannot verify.
      </p>
      <div
        className="mt-8 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Listing format"
      >
        {(["text", "json", "csv"] as Format[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={format === item}
            onClick={() => setFormat(item)}
            className={`min-h-11 rounded-full border px-5 py-2 text-sm font-semibold capitalize transition-colors duration-100 ${format === item ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--border)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)]"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <label className="mt-8 block text-sm font-semibold text-[var(--ink)]">
        Product listing
        <textarea
          aria-label="Product listing"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-3 min-h-64 w-full rounded-xl border border-[var(--ink)] bg-[var(--canvas)] p-5 text-[var(--ink)] shadow-none transition-shadow duration-200 placeholder:text-[var(--muted)] focus:shadow-[0_0_0_3px_rgb(20_20_19_/_12%)]"
          placeholder={
            format === "text"
              ? "CloudRun Pro\nA lightweight and comfortable running shoe..."
              : format === "json"
                ? '{ "name": "CloudRun Pro" }'
                : "name,description,price"
          }
        />
      </label>
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-[var(--missing)] bg-[#fff5f2] p-4 text-sm text-[var(--missing)]"
        >
          {error}
        </div>
      )}
      <button
        disabled={stage !== "idle"}
        className="button-primary mt-6 inline-flex min-h-12 items-center px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {stage === "importing"
          ? "Importing listing…"
          : stage === "extracting"
            ? "Building Product Passport…"
            : "Analyse listing"}
      </button>
    </form>
  );
}
