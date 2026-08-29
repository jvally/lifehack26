"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicProduct } from "@/app/api/products/route";
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

export function CataloguePage() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogue() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/products");
        const data = await readApiData<{ products: PublicProduct[] }>(
          response,
          "We could not load the product catalogue.",
        );
        if (cancelled) return;
        setProducts(data.products ?? []);
      } catch (reason) {
        if (cancelled) return;
        setError(
          reason instanceof ClientApiError || reason instanceof Error
            ? reason.message
            : "We could not load the product catalogue.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="eyebrow">Buyer Catalogue</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Product Catalogue
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          Explore products with verified specifications and structured product truth.
        </p>
      </header>

      {loading && (
        <section
          role="status"
          aria-label="Loading catalogue"
          className="surface-card mx-auto max-w-md border-[var(--border)] p-8 text-center"
        >
          <p className="eyebrow">Catalogue</p>
          <p className="mt-3 text-lg font-semibold text-[var(--ink)]">Loading products…</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Fetching the latest verified listings.</p>
        </section>
      )}

      {error && !loading && (
        <section
          role="alert"
          className="surface-card mx-auto max-w-xl border-[var(--missing)] p-6"
        >
          <h2 className="text-xl font-bold text-[var(--ink)]">Failed to load catalogue</h2>
          <p className="mt-2 text-sm text-[var(--missing)]">{error}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((prev) => prev + 1)}
            className="button-primary mt-4 min-h-10 px-4 py-2 text-sm font-semibold"
          >
            Retry
          </button>
        </section>
      )}

      {!loading && !error && products.length === 0 && (
        <section className="surface-card mx-auto max-w-md border-[var(--border)] p-8 text-center">
          <p className="eyebrow">Catalogue</p>
          <p className="mt-3 text-lg font-semibold text-[var(--ink)]">No products found</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            There are no products available in the catalogue right now.
          </p>
        </section>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="surface-card flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{formatCategory(product.category)}</span>
                  <span className="mono-label font-semibold text-[var(--ink)]">
                    {formatPrice(product.price, product.currency)}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-[var(--ink)]">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {product.description || "No description provided."}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <Link
                  href={`/catalog/${product.id}`}
                  className="button-primary inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm font-semibold"
                >
                  View product
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
