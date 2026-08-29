# AgentReady Coach

AgentReady Coach turns an incomplete seller listing into an evidence-aware Product Passport, identifies what limits AI shopping recommendations, and guides the seller through the highest-impact answers.

## Architecture

Listing import → Product Passport extraction → market context and deterministic evaluation → seller interview → before and after recommendation simulation.

The Next.js interface is separate from the deterministic domain engine. Product claims use one provenance state: `verified`, `seller_declared`, `ai_inferred`, or `missing`. Permitted competitor observations inform benchmarks only. They never become seller claims.

## Install

Use Node.js 24. From this directory:

```powershell
npm ci
```

## Offline development

Offline mode is deliberate and visible. It uses local dashboard and simulation data after the import screen.

```powershell
$env:NEXT_PUBLIC_OFFLINE_DEMO = "true"
npm run dev
```

Run the secret-free browser journey with:

```powershell
npm run e2e:offline
```

The browser runner builds the application, starts a production server, runs Playwright, and terminates only the server process it created.

## Live local development

Copy `.env.example` to `.env.local`, replace every placeholder, and keep:

```text
NEXT_PUBLIC_OFFLINE_DEMO=false
```

The required server values are:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=
OPENAI_QUERY_MODEL=
OPENAI_EMBEDDING_MODEL=
```

Validate the environment without printing secret values:

```powershell
npm run check:release-env
```

Apply and validate the Supabase migrations for the intended project:

```powershell
npx supabase db push
npx supabase db lint
```

Seed twice to verify idempotency, then start live development:

```powershell
npm run seed:release
npm run dev
```

Run the real API journey locally with:

```powershell
npm run e2e:live
```

The live journey does not intercept application API routes. It verifies import, extraction, evaluation, interview progression, simulation, persistence, and Product Passport export.

## Verification

Secret-free checks:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e:offline
npm audit --omit=dev --audit-level=high
```

For a deployed preview, set the same six release variables in the hosting environment and ensure offline mode is false. Then run:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://your-preview.example"
npm run e2e:live
```

Code-complete means the secret-free checks pass. Release-verified additionally requires migrations, the double seed, the local live journey, and the deployed preview journey to pass with real credentials.

## Three-minute demo

1. Open **Analyse a listing** and paste the weak CloudRun Pro listing.
2. Show the initial AI Readiness score and high-priority evidence gaps.
3. Open the Seller Coach and confirm measured weight with supporting evidence.
4. Confirm road terrain and humid-weather suitability.
5. Point out the updated Product Passport and provenance badges.
6. Run the saved Singapore half-marathon shopper query.
7. Compare Before and After eligibility, rank, matched facts, and evidence.
8. Export the Product Passport from the integrated product endpoint.

## Deployment boundary

Deploy with `web` as the application root. Keep the Supabase service role key and OpenAI key server-side. This Phase 1 build is suitable for a controlled demonstration. It is not ready for public multi-user production until Phase 2 adds authentication, product ownership, user-scoped row-level security, and rate limiting.
