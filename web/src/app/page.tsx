import Link from "next/link";

export default function Home() {
  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col justify-center px-6 py-16">
      <p className="eyebrow mb-5">
        Evidence-first commerce intelligence
      </p>
      <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] text-[var(--ink)] sm:text-7xl">
        RET-AI-L Ready
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
        Give every product the evidence it needs to answer an AI shopper with confidence. Buyers browse verified products in the public catalogue, while sellers use RetailReady to improve product data and close evidence gaps.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          className="button-primary inline-flex min-h-12 items-center px-6 py-3 font-semibold"
          href="/catalog"
        >
          Browse catalogue
        </Link>
        <Link
          className="button-secondary inline-flex min-h-12 items-center px-6 py-3 font-semibold"
          href="/products/new"
        >
          Use RetailReady
        </Link>
      </div>
      <div className="mt-20 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-[var(--ink)] bg-[var(--ink)] sm:grid-cols-3">
        {[
          ["01", "Extract", "Turn a source listing into structured product truth."],
          ["02", "Evidence", "Surface the facts an AI shopper still cannot verify."],
          ["03", "Improve", "Close the highest-impact gaps and compare results."],
        ].map(([number, title, description]) => (
          <div key={number} className="bg-[var(--canvas)] p-5 sm:p-6">
            <span className="mono-label text-[var(--muted)]">{number}</span>
            <h2 className="mt-8 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
