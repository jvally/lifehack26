# Release Integration Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the controlled demo use real APIs by default, keep mocks behind an explicit offline mode, and add reliable local and CI release gates.

**Architecture:** Client requests share one typed envelope reader so API errors and request IDs are preserved consistently. ProductDashboard uses explicit loading, ready, offline, and error states; Playwright runs through a Node-owned server lifecycle with separate offline and live journeys. CI enforces all secret-free gates, while live verification remains opt-in and credential-dependent.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Playwright, Supabase, OpenAI, GitHub Actions, Node.js 24.

**Spec:** `docs/superpowers/specs/2026-08-29-release-integration-design.md`

## Global Constraints

- Node.js must remain on `24.x`.
- Live mode is the default and must never silently display mock results.
- Offline data is available only when `NEXT_PUBLIC_OFFLINE_DEMO=true`.
- No secret value may be committed, logged, or returned to the browser.
- Phase 1 does not add authentication, product ownership, user-scoped RLS, or rate limiting.
- Every behavior change begins with a failing test.
- The live E2E journey must not intercept application API routes.

---

### Task 1: Shared client API envelope handling

**Files:**
- Create: `web/src/lib/client-api.ts`
- Create: `web/src/lib/client-api.test.ts`
- Modify: `web/src/components/import-listing-form.tsx`
- Modify: `web/src/components/import-listing-form.test.tsx`

**Interfaces:**
- Consumes: `Response` objects using `{ ok, data, error, requestId }`.
- Produces: `readApiData<T>(response, fallback): Promise<T>` and `ClientApiError` with a user-safe message and optional request ID.

- [ ] **Step 1: Write failing envelope tests**

Test successful data, shared API errors, non-JSON failures, and missing data:

```ts
import { describe, expect, it } from "vitest";
import { ClientApiError, readApiData } from "./client-api";

describe("readApiData", () => {
  it("returns successful response data", async () => {
    const response = new Response(JSON.stringify({ ok: true, data: { id: "product-1" }, requestId: "request-1" }), { status: 200 });
    await expect(readApiData<{ id: string }>(response, "Import failed.")).resolves.toEqual({ id: "product-1" });
  });

  it("preserves the shared message and request ID", async () => {
    const response = new Response(JSON.stringify({ ok: false, error: { message: "Product missing." }, requestId: "request-2" }), { status: 404 });
    await expect(readApiData(response, "Import failed.")).rejects.toEqual(new ClientApiError("Product missing. Request ID: request-2", "request-2"));
  });

  it("uses the fallback for non-JSON responses", async () => {
    const response = new Response("gateway failure", { status: 502 });
    await expect(readApiData(response, "Import failed.")).rejects.toThrow("Import failed.");
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- src/lib/client-api.test.ts`

Expected: FAIL because `client-api.ts` does not exist.

- [ ] **Step 3: Implement the typed reader**

Implement:

```ts
export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
  requestId?: string;
};

export class ClientApiError extends Error {
  constructor(message: string, readonly requestId: string | null = null) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function readApiData<T>(response: Response, fallback: string): Promise<T> {
  let body: ApiEnvelope<T>;
  try {
    body = await response.json() as ApiEnvelope<T>;
  } catch {
    throw new ClientApiError(fallback);
  }
  if (!response.ok || !body.ok || body.data === undefined) {
    const message = body.error?.message ?? fallback;
    throw new ClientApiError(
      body.requestId ? `${message} Request ID: ${body.requestId}` : message,
      body.requestId ?? null,
    );
  }
  return body.data;
}
```

- [ ] **Step 4: Route import form responses through `readApiData`**

Use `readApiData<{ productIds: string[] }>` for import and `readApiData<unknown>` for extraction. Bind caught errors and display `error.message`; remove the form-local envelope and request-ID duplication.

- [ ] **Step 5: Extend import form tests**

Add a failed import response with `requestId: "request-import"` and assert the alert contains `Request ID: request-import`.

- [ ] **Step 6: Run Task 1 tests**

Run: `npm test -- src/lib/client-api.test.ts src/components/import-listing-form.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```text
git add web/src/lib/client-api.ts web/src/lib/client-api.test.ts web/src/components/import-listing-form.tsx web/src/components/import-listing-form.test.tsx
git commit -m "feat: standardize client API errors"
```

---

### Task 2: Explicit dashboard integration state

**Files:**
- Modify: `web/src/components/product-dashboard.tsx`
- Modify: `web/src/components/product-dashboard.test.tsx`
- Modify: `web/src/components/seller-chat.tsx`
- Modify: `web/src/components/seller-chat.test.tsx`
- Modify: `web/src/components/before-after-panel.tsx`
- Create: `web/src/components/before-after-panel.test.tsx`

**Interfaces:**
- Consumes: `readApiData<T>`, real product/evaluation/interview endpoints, and `NEXT_PUBLIC_OFFLINE_DEMO`.
- Produces: `ProductDashboard({ productId, offlineDemo? })`, a live-first state machine, and explicit offline behavior.

- [ ] **Step 1: Replace the existing dashboard test with failing state tests**

Cover these cases:

```ts
function apiResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify({ ok: true, data, requestId: "request-test" }), { status });
}

it("disables the coach while live initialization is pending", () => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
  render(<ProductDashboard productId="product-1" offlineDemo={false} />);
  expect(screen.getByRole("button", { name: "Analysing listing…" })).toBeDisabled();
});

it("uses the real session id and returned next gap", async () => {
  const dashboard = makeMockDashboard("product-1");
  const firstGap = dashboard.evaluation.gaps[0];
  const returnedGap = dashboard.evaluation.gaps[1];
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(apiResponse({ passport: dashboard.passport, evaluation: dashboard.evaluation }))
    .mockResolvedValueOnce(apiResponse({ evaluation: dashboard.evaluation, intelligence: dashboard.intelligence }))
    .mockResolvedValueOnce(apiResponse({ session: { id: "session-live-1" }, nextGap: firstGap }, 201))
    .mockResolvedValueOnce(apiResponse({ passport: dashboard.passport, evaluation: dashboard.evaluation, nextGap: returnedGap }));
  vi.stubGlobal("fetch", fetchMock);
  render(<ProductDashboard productId="product-1" offlineDemo={false} />);
  await screen.findByText(dashboard.passport.name);
  await userEvent.click(screen.getAllByRole("button", { name: "Open seller coach" })[0]);
  await userEvent.type(await screen.findByLabelText("Your answer"), "220");
  await userEvent.click(screen.getByRole("button", { name: "Save answer" }));
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/interviews/session-live-1/answers",
    expect.objectContaining({ method: "POST" }),
  );
  expect(await screen.findByText(returnedGap.question)).toBeInTheDocument();
});

it("shows a request ID instead of mock data when live initialization fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: false, error: { message: "Database unavailable." }, requestId: "request-live-1" }), { status: 503 }),
  ));
  render(<ProductDashboard productId="product-1" offlineDemo={false} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Request ID: request-live-1");
  expect(screen.queryByText("CloudRun Pro")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add failing offline-mode tests**

Render with `offlineDemo={true}`, assert CloudRun Pro is shown, and assert `fetch` is not called during dashboard initialization or recommendation simulation.

- [ ] **Step 3: Add failing SellerChat error and gap-change tests**

Assert that an `Error("Save failed. Request ID: request-answer")` from `onUpdate` appears verbatim. Rerender with a different feature and assert the answer, evidence, unit, and previous notice reset.

- [ ] **Step 4: Add failing simulation tests**

Assert that live errors display their request ID and clear previous results. Assert that offline simulation returns deterministic mock results without calling `fetch`.

- [ ] **Step 5: Run focused component tests and confirm failure**

Run: `npm test -- src/components/product-dashboard.test.tsx src/components/seller-chat.test.tsx src/components/before-after-panel.test.tsx`

Expected: FAIL against the current implicit mock mode and generic answer error.

- [ ] **Step 6: Implement the live-first dashboard state machine**

Use these states:

```ts
type DashboardPhase = "loading" | "ready" | "offline" | "error";

export function ProductDashboard({
  productId,
  offlineDemo = process.env.NEXT_PUBLIC_OFFLINE_DEMO === "true",
}: {
  productId: string;
  offlineDemo?: boolean;
}) {
  const [phase, setPhase] = useState<DashboardPhase>(offlineDemo ? "offline" : "loading");
  const [dashboard, setDashboard] = useState<DashboardState | null>(
    offlineDemo ? makeMockDashboard(productId) : null,
  );
}
```

For live initialization, require the Product Passport from GET and require both evaluation and intelligence from POST. Only then set a complete dashboard and `phase = "ready"`. Render a loading panel during `loading`, an error panel with retry during `error`, and never construct mock data in either state.

- [ ] **Step 7: Implement deterministic coach startup**

Add `coachStarting`. Keep coach controls disabled unless phase is `ready` or `offline`. In live mode, set `coachOpen` only after `data.session.id` arrives, store that ID, and set `nextGap` from the response.

- [ ] **Step 8: Implement live answer progression**

Use `readApiData` for answers. Store returned passport and evaluation, then set `nextGap` exactly to the returned value. SellerChat must display the caught `Error.message` and reset its form state when `gap.featureKey` changes.

- [ ] **Step 9: Implement explicit simulation behavior**

Rename `allowMockFallback` to `offlineDemo`. In offline mode, create mock results without a network request. In live mode, use `readApiData`, clear stale results when comparing, and display the thrown message on failure.

- [ ] **Step 10: Run Task 2 tests**

Run: `npm test -- src/components src/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 11: Commit Task 2**

```text
git add web/src/components
git commit -m "feat: make dashboard integration live first"
```

---

### Task 3: Reliable offline and live browser gates

**Files:**
- Create: `web/scripts/run-playwright.ts`
- Modify: `web/playwright.config.ts`
- Rename: `web/e2e/seller-optimization.spec.ts` to `web/e2e/seller-optimization.offline.spec.ts`
- Create: `web/e2e/seller-optimization.live.spec.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes: `PLAYWRIGHT_MODE`, `PLAYWRIGHT_BASE_URL`, installed Next and Playwright CLIs, and release environment values for live local runs.
- Produces: `npm run e2e:offline` and `npm run e2e:live`, both with bounded execution and deterministic server cleanup.

- [ ] **Step 1: Add runner unit boundaries**

Export pure helpers from `run-playwright.ts` for mode parsing and server environment construction. Add `web/scripts/run-playwright.test.ts` that verifies offline mode sets `NEXT_PUBLIC_OFFLINE_DEMO=true`, live mode sets it to `false`, and an explicit base URL disables local server startup.

- [ ] **Step 2: Run the runner test and confirm failure**

Run: `npm test -- scripts/run-playwright.test.ts`

Expected: FAIL because the runner does not exist.

- [ ] **Step 3: Implement the Node-owned lifecycle**

The runner must:

1. Parse exactly `offline` or `live` from the first argument.
2. Use `PLAYWRIGHT_BASE_URL` when supplied.
3. When local, run Next build with the chosen offline flag.
4. Start `next start` directly with `process.execPath` and the installed Next CLI.
5. Poll the base URL with a 60-second deadline.
6. Run Playwright directly with `process.execPath` and the installed Playwright CLI.
7. In `finally`, terminate only the spawned server process tree.
8. On Windows, use `taskkill /PID <pid> /T /F`; elsewhere, terminate the detached process group.
9. Exit with the build, server, or Playwright failure code.

- [ ] **Step 4: Split Playwright modes**

Configure `testMatch` from `PLAYWRIGHT_MODE`:

```ts
const mode = process.env.PLAYWRIGHT_MODE ?? "offline";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testMatch: mode === "live" ? /.*\.live\.spec\.ts/ : /.*\.offline\.spec\.ts/,
  globalTimeout: 120_000,
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
});
```

Remove Playwright's `webServer` plugin because the Node runner owns the lifecycle.

- [ ] **Step 5: Make offline coverage explicit**

Rename the existing test, keep only import and extract route interception, and assert recommendation comparison uses offline behavior. The test title must include `offline demo`.

- [ ] **Step 6: Add the live journey**

The live test must not call `page.route`. It must import a listing, capture the UUID from the resulting URL, wait for real evaluation, start the coach, answer the rendered control according to its element type, submit evidence, run simulation, and GET `/api/products/{uuid}/export` with `page.request`.

Skip before navigation unless `PLAYWRIGHT_MODE === "live"`. A live failure is a real failure once the live command is selected.

- [ ] **Step 7: Add package scripts**

```json
{
  "scripts": {
    "e2e": "npm run e2e:offline",
    "e2e:offline": "tsx scripts/run-playwright.ts offline",
    "e2e:live": "tsx scripts/run-playwright.ts live"
  }
}
```

- [ ] **Step 8: Run the offline gate twice**

Run:

```text
npm run e2e:offline
npm run e2e:offline
```

Expected: both commands PASS, both exit, and `netstat -ano` shows no listener on port 3000 afterward.

- [ ] **Step 9: Run the runner and browser tests**

Run: `npm test -- scripts/run-playwright.test.ts && npm run e2e:offline`

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

```text
git add web/scripts web/playwright.config.ts web/e2e web/package.json
git commit -m "test: separate offline and live browser gates"
```

---

### Task 4: CI and release verification contract

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `web/src/scripts/check-release-env.ts`
- Modify: `web/src/lib/env.ts`
- Modify: `web/src/lib/env.test.ts`
- Modify: `web/.env.example`
- Modify: `web/package.json`
- Modify: `web/README.md`

**Interfaces:**
- Consumes: the six existing Supabase and OpenAI environment variables.
- Produces: `missingReleaseEnvironmentKeys`, `npm run check:release-env`, `npm run seed:release`, CI, and a complete preview verification runbook.

- [ ] **Step 1: Write failing environment-key tests**

Add:

```ts
it("reports missing release variables without values", () => {
  expect(missingReleaseEnvironmentKeys({ OPENAI_API_KEY: "secret" })).toEqual([
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_EXTRACTION_MODEL",
    "OPENAI_QUERY_MODEL",
    "OPENAI_EMBEDDING_MODEL",
  ]);
});
```

- [ ] **Step 2: Run the environment tests and confirm failure**

Run: `npm test -- src/lib/env.test.ts`

Expected: FAIL because `missingReleaseEnvironmentKeys` does not exist.

- [ ] **Step 3: Implement environment-name validation**

Export the ordered `RELEASE_ENVIRONMENT_KEYS` tuple and `missingReleaseEnvironmentKeys(source)`. The function returns names only and never includes values.

Create `check-release-env.ts` that loads `.env.local` and `.env`, prints missing names to stderr, exits 1 when any are absent, and prints a success count without values when all are present.

- [ ] **Step 4: Add release scripts**

Add:

```json
{
  "scripts": {
    "check:release-env": "tsx src/scripts/check-release-env.ts",
    "seed:release": "npm run check:release-env && npm run seed:demo && npm run seed:demo"
  }
}
```

- [ ] **Step 5: Document explicit offline and live workflows**

Add `NEXT_PUBLIC_OFFLINE_DEMO=false` to `.env.example`. Update README with:

1. Offline development and its explicit flag.
2. Live local prerequisites.
3. Supabase migration and lint commands.
4. `npm run seed:release`.
5. Offline and live E2E commands.
6. Preview verification with `PLAYWRIGHT_BASE_URL`.
7. The distinction between code-complete and release-verified.
8. The Phase 2 authentication limitation.

- [ ] **Step 6: Add CI**

Create a workflow for pushes and pull requests to `main`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e:offline
```

- [ ] **Step 7: Run all secret-free gates**

Run:

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e:offline
npm audit --omit=dev --audit-level=high
git diff --check
```

Expected: every command exits 0 and the Git worktree is clean after committing.

- [ ] **Step 8: Confirm the credential boundary**

Run: `npm run check:release-env`

Expected in the current workspace: exit 1 listing missing variable names only. Record live migration, seed, and preview E2E as blocked until the user configures values.

- [ ] **Step 9: Commit Task 4**

```text
git add .github/workflows/ci.yml web/src/scripts web/src/lib/env.ts web/src/lib/env.test.ts web/.env.example web/package.json web/README.md
git commit -m "ci: add controlled demo release gates"
```

---

### Task 5: Final review and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-08-29-release-integration.md`

**Interfaces:**
- Consumes: all Phase 1 code-complete evidence.
- Produces: checked plan, review evidence, and a clear list of credential-dependent release steps.

- [ ] **Step 1: Mark completed plan steps**

Change completed checkboxes from `[ ]` to `[x]`. Leave credential-dependent release verification unchecked with a short evidence note.

- [ ] **Step 2: Review the branch against the specification**

Inspect `git diff main...HEAD`, scan for secrets and accidental artifacts, and verify there are no remaining automatic mock fallbacks in live code.

- [ ] **Step 3: Run final verification**

Run the complete secret-free gate from Task 4 again on the exact final tree.

- [ ] **Step 4: Request code review**

Review correctness, test coverage, security boundaries, and spec compliance. Fix Critical and Important findings through new failing tests before completion.

- [ ] **Step 5: Commit plan completion evidence**

```text
git add docs/superpowers/plans/2026-08-29-release-integration.md
git commit -m "docs: record phase one verification"
```

- [ ] **Step 6: Report the release boundary**

Report code-complete checks separately from blocked live checks. Do not claim deploy-ready until migrations, double seed, live E2E, and preview verification pass with configured credentials.
