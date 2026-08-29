# AgentReady Coach

AgentReady Coach turns an incomplete seller listing into an evidence-aware Product Passport, identifies the information that limits AI-shopping recommendations, and guides the seller through the highest-impact answers.

## Architecture

Listing import → Product Passport extraction → market context + deterministic evaluation → seller interview → before/after recommendation simulation.

The Next.js interface is intentionally separate from the deterministic domain engine. Product claims carry one provenance state: `verified`, `seller_declared`, `ai_inferred`, or `missing`. Permitted competitor observations inform benchmarks only; they never become seller claims.

## Local setup

Use Node.js 24 LTS. From this directory:

```powershell
npm install
npm run dev
```

Create `.env.local` with server-side values only:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=
OPENAI_QUERY_MODEL=
OPENAI_EMBEDDING_MODEL=
```

Once the backend seed command is available, run `npm run seed:demo`. It is expected to be idempotent.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run e2e
```

## Three-minute demo

1. Open **Analyse a listing** and paste the weak CloudRun Pro listing.
2. Show the initial AI Readiness score and the high-priority evidence gaps.
3. Open the Seller Coach and confirm measured weight with supporting evidence.
4. Confirm road terrain and humid-weather suitability.
5. Point out the updated Product Passport and provenance badges.
6. Run the saved Singapore half-marathon shopper query.
7. Compare Before and After eligibility, rank, matched facts, and evidence.
8. Export the resulting Product Passport from the integrated product endpoint.

## Deployment and demo safety

Deploy Vercel with `web` as the root directory and configure the environment variables above in the Vercel project. Test a preview deployment with Playwright before promotion. This MVP is a controlled demonstration only until authentication and Supabase row-level access policies are enabled. Never expose service-role or OpenAI credentials to the browser.
