"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicProductDetail } from "@/app/api/catalog/products/[productId]/route";
import { ClientApiError, readApiData } from "@/lib/client-api";

function formatCategory(category: string): string {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return "Price not listed";
  if (!currency) return `$${price}`;
  return `${currency} $${price}`;
}

function formatFeatureValue(
  value: PublicProductDetail["features"][number]["value"],
  unit: string | null,
): string {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return unit ? `${value} ${unit}` : String(value);
}

export function CatalogueProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<PublicProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/catalog/products/${productId}`);
        const data = await readApiData<PublicProductDetail>(
          response,
          "We could not load this product.",
        );
        if (cancelled) return;
        setProduct(data);
      } catch (reason) {
        if (cancelled) return;
        setError(
          reason instanceof ClientApiError || reason instanceof Error
            ? reason.message
            : "We could not load this product.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId, loadAttempt]);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          href="/catalog"
          className="button-secondary inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold"
        >
          ← Back to catalogue
        </Link>
      </div>

      {loading && (
        <section
          role="status"
          aria-label="Loading product details"
          className="surface-card mx-auto max-w-md border-[var(--border)] p-8 text-center"
        >
          <p className="eyebrow">Catalogue</p>
          <p className="mt-3 text-lg font-semibold text-[var(--ink)]">Loading product details…</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Fetching verified specifications.</p>
        </section>
      )}

      {error && !loading && (
        <section
          role="alert"
          className="surface-card mx-auto max-w-xl border-[var(--missing)] p-6"
        >
          <h2 className="text-xl font-bold text-[var(--ink)]">Could not load product</h2>
          <p className="mt-2 text-sm text-[var(--missing)]">{error}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setLoadAttempt((prev) => prev + 1)}
              className="button-primary min-h-10 px-4 py-2 text-sm font-semibold"
            >
              Retry
            </button>
            <Link
              href="/catalog"
              className="button-secondary inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold"
            >
              Back to catalogue
            </Link>
          </div>
        </section>
      )}

      {!loading && !error && product && (
        <div className="space-y-8">
          <section className="surface-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="eyebrow">{formatCategory(product.category)}</span>
              <span className="mono-label text-lg font-bold text-[var(--ink)]">
                {formatPrice(product.price, product.currency)}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <h2 className="text-sm font-semibold text-[var(--ink)]">About this product</h2>
              <p className="mt-2 text-base leading-7 text-[var(--muted)]">
                {product.description || "No description provided."}
              </p>
            </div>
          </section>

          <section className="surface-card p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
              Product Specifications
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Verified features and structured attributes for this product.
            </p>

            {product.features.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No specifications have been published for this product yet.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {product.features.map((feature) => (
                  <div
                    key={feature.key}
                    className="rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-4"
                  >
                    <span className="mono-label text-xs text-[var(--muted)]">
                      {feature.label}
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                      {formatFeatureValue(feature.value, feature.unit)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
