export default function Home() {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
        Evidence-first commerce intelligence
      </p>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
        AgentReady Coach
      </h1>
      <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-600">
        Give every product the evidence it needs to answer an AI shopper.
      </p>
      <a
        className="mt-8 w-fit rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
        href="/products/new"
      >
        Analyze a listing
      </a>
    </main>
  );
}
