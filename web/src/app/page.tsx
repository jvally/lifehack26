export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">
        Product intelligence for agentic commerce
      </p>
      <h1 className="text-5xl font-semibold tracking-tight">
        AgentReady Coach
      </h1>
      <p className="mt-5 max-w-2xl text-xl text-zinc-600">
        Teach every product how to answer an AI shopper.
      </p>
      <a
        className="mt-8 w-fit rounded-full bg-violet-600 px-6 py-3 font-medium text-white"
        href="/products/new"
      >
        Analyze a listing
      </a>
    </main>
  );
}
