# Release Integration Phase 1 Design

**Date:** 2026-08-29

**Status:** Approved in chat, pending written review

## 1. Objective

Prepare AgentReady Coach for a controlled demo release without adding public-user authentication yet. The release must use the real application APIs by default, expose mock behavior only through an explicit offline-development setting, and provide repeatable local and CI verification.

Public production hardening, including authentication, ownership, user-scoped row-level security, and rate limiting, remains Phase 2.

## 2. Current problems

The integrated application builds and type-checks, but the release gate is not green:

1. The dashboard test fails because it queries two identically named coach buttons as if only one exists.
2. The dashboard starts in mock mode, so a real API failure can display plausible demo data without telling the user.
3. The coach can be opened before product loading and evaluation have established live mode.
4. Answer errors include useful request IDs in the dashboard layer, but SellerChat replaces them with generic text.
5. The browser test intercepts the core APIs and therefore does not prove the Supabase, OpenAI, interview, or recommendation path.
6. Playwright completes the browser assertions but hangs while tearing down the development server.
7. No Supabase or OpenAI environment values are configured in the current workspace, so live seed and E2E verification cannot run yet.
8. There is no CI workflow that enforces the release checks.

## 3. Scope

### Included

1. Explicit live and offline application modes.
2. Reliable dashboard loading, evaluation, coach startup, answer, and simulation states.
3. Shared API error and request-ID display in the UI.
4. Focused component tests for every integration state.
5. Deterministic offline browser coverage.
6. A separate live browser journey with no application API interception.
7. Deterministic Playwright server startup and teardown.
8. Node 24 CI for install, tests, typecheck, lint, build, and offline browser verification.
9. Environment validation and documented Supabase migration, seed, preview, and live E2E commands.

### Excluded

1. Supabase Auth UI.
2. Product ownership schema changes.
3. User-scoped RLS policies.
4. API rate limiting.
5. Public production promotion.

## 4. Runtime mode contract

`NEXT_PUBLIC_OFFLINE_DEMO` controls offline behavior.

1. When the value is exactly `true`, the dashboard uses deterministic local demo data and never presents that data as a live API result.
2. When absent or any other value, the dashboard runs in live mode.
3. A live API failure produces an error state with the shared message and request ID when available.
4. Live mode never falls back to mock Product Passports, scores, sessions, or recommendation results.

The variable will be added to `.env.example` with a default of `false` and documented as development-only.

## 5. Dashboard state model

Replace the current `mock | live` flag with explicit state:

```text
loading -> live-ready -> coach-starting -> coach-open
loading -> error
offline -> offline-coach-open
```

The dashboard data is nullable until either live initialization succeeds or explicit offline mode creates demo data.

### Live initialization

1. Fetch `GET /api/products/{productId}`.
2. Require a Product Passport from the response.
3. Run `POST /api/products/{productId}/evaluate`.
4. Require both `evaluation` and `intelligence` from the response.
5. Render the dashboard and enable the coach only after both requests succeed.
6. Display `Analysing listing...` while initialization runs.
7. On failure, render the API error and a retry action. Do not render mock product data.

### Coach startup

1. Disable coach controls during initialization and coach startup.
2. Call `POST /api/products/{productId}/interviews` once.
3. Require `data.session.id`.
4. Store the real session ID.
5. Set the active question from `data.nextGap`.
6. Open SellerChat only after startup succeeds.
7. Preserve the previous dashboard if startup fails and display the shared API error.

### Answers

1. Send answers to `/api/interviews/{sessionId}/answers` in live mode.
2. Require `passport` and `evaluation` from the response.
3. Set the active question from `nextGap`, including `null` when the interview is complete.
4. Preserve and display the API error message and request ID.
5. Reset answer, unit, evidence, and notice state when the active feature changes.

### Recommendation simulation

1. Live mode requires a successful response containing `before` and `after` results.
2. Clear stale results before each request and after a failed request.
3. Display the shared error and request ID on failure.
4. Offline mode may generate deterministic mock results, but only when the explicit offline setting is active.

## 6. Testing design

### Component tests

Add focused tests that verify:

1. The initial loading state disables coach controls.
2. Successful initialization renders only real Product Passport, evaluation, and intelligence data.
3. Product and evaluation failures never expose mock data in live mode.
4. Offline mode uses demo data without calling the application APIs.
5. Coach startup stores `data.session.id`.
6. Submitting an answer calls `/api/interviews/{sessionId}/answers`.
7. Start and answer responses render the returned `nextGap`.
8. API failures display request IDs.
9. Simulation failures do not retain old results or generate mock results in live mode.

Queries will be scoped to the relevant region when duplicate accessible names are intentional.

### Offline browser test

Keep a fast UI-only Playwright journey, but label it explicitly as offline coverage. It may intercept network requests or run with offline mode enabled. It must not be described as a full-stack test.

### Live browser test

Add a separate `e2e:live` journey that:

1. Uses a real local or preview base URL.
2. Does not intercept application API routes.
3. Imports a listing and receives a real UUID.
4. Verifies extraction and evaluation.
5. Starts an interview and submits evidence through the real session ID.
6. Verifies the returned next question.
7. Runs the before-and-after recommendation simulation.
8. Exports the final Product Passport.

The live test is skipped with an explicit explanation when required environment values are unavailable. A manual or secret-enabled CI job runs it before preview promotion.

## 7. Playwright lifecycle

The existing `npm run dev` web-server command leaves a process tree that Playwright cannot tear down reliably on Windows.

The offline test runner will launch Next directly through its installed CLI instead of an npm child process. Startup and teardown must be proven by running the command twice consecutively and confirming that both invocations exit and release port 3000. A bounded global timeout will prevent indefinite release jobs.

Live preview tests will use `PLAYWRIGHT_BASE_URL` and will not start a local server.

## 8. CI and release scripts

Add a GitHub Actions workflow using Node 24 that runs:

```text
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e:offline
```

Add an environment validation command that reports missing variable names without printing secret values. Add documented commands for:

1. Applying or resetting Supabase migrations.
2. Running schema lint.
3. Seeding demo data twice.
4. Running the live E2E test locally.
5. Running the live E2E test against a preview URL.

## 9. Error handling

All live UI requests will parse the shared API envelope. If a response is not valid JSON, the UI will show a stable fallback message. If `requestId` exists, it will be shown to the user. Errors will not be converted into successful demo output.

## 10. Acceptance criteria

Phase 1 is code-complete when:

1. `npm test` exits successfully.
2. `npm run typecheck` exits successfully.
3. `npm run lint` exits successfully.
4. `npm run build` exits successfully.
5. `npm run e2e:offline` passes twice consecutively and releases port 3000.
6. Live mode contains no silent mock fallback.
7. Offline behavior requires explicit configuration.
8. CI runs all non-secret gates on every pull request.
9. The workspace remains clean after verification.

Phase 1 is release-verified when, in addition:

1. Supabase and OpenAI environment values are configured.
2. Migrations apply successfully to the target database.
3. Demo seeding succeeds twice without duplication.
4. The live E2E journey passes against the preview deployment.
5. The preview is manually checked against the three-minute demo script.

## 11. Delivery boundary

Implementation may complete all code, tests, CI, scripts, and documentation without credentials. Live migration, seed, and preview verification will remain explicitly blocked until the user supplies or configures the required Supabase and OpenAI values. No secret values will be committed or printed.
