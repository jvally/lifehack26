# Role 1 Main Conflict Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `origin/main` into `feat/platform-data` while preserving Role 1 persistence and API guarantees and connecting the completed Role 2, Role 3, and Role 4 services.

**Architecture:** Repository contracts are the shared boundary and must contain product, market, session, and evidence interfaces. The dependency container returns one cached set of real Supabase and OpenAI adapters. Route handlers invoke the domain orchestration functions from `application-service.ts` and the feature modules directly. The temporary Role 1 application stub is removed.

**Tech Stack:** Next.js 16.3.3, TypeScript, Vitest, Zod, Supabase PostgreSQL, pgvector, OpenAI SDK, npm

**Spec:** `docs/superpowers/plans/2026-08-29-agentready-coach.md`

## Global Constraints

- Preserve `feat/platform-data` history by merging `origin/main`; do not rebase or force push.
- Preserve Role 1 strict request validation, structured API errors, atomic product writes, and generated database typing.
- Preserve Role 2 AI and embedding adapters, Role 3 evaluation and interview orchestration, and Role 4 UI and demo data.
- Do not expose Supabase service credentials to client modules.
- Resolve the merge with one final merge commit after all checks pass.

---

### Task 1: Resolve package and shared contract conflicts

**Files:**
- Modify: `web/package.json`
- Regenerate: `web/package-lock.json`
- Modify: `web/src/lib/api-response.ts`
- Modify: `web/src/services/repositories/contracts.ts`
- Modify: `web/src/app/api/products/route.ts`

**Interfaces:**
- Consumes: Role 1 package scripts, repository contracts, and API helpers plus the Role 2 and Role 3 dependencies now on `main`
- Produces: one installable dependency graph and shared TypeScript interfaces for all roles

- [ ] **Step 1: Resolve `package.json` as a superset**

Keep the Node 24 engine, `seed:demo` script, and Role 1 dependency versions that already passed the complete suite. Preserve every dependency introduced on `main`.

- [ ] **Step 2: Preserve strict API behavior**

Resolve `api-response.ts` with `ApiRequestError`, Zod issue details, catalog issue details, hidden unexpected messages, and stable 400, 404, and 500 mappings. Resolve the product import route with `.strict()` and the one million character input bound.

- [ ] **Step 3: Combine repository contracts**

Keep `RawProductInput`, `ProductRecord`, `InterviewSession`, `ProductRepository`, `MarketRepository`, and `SessionRepository`. Add `EvidenceRecord` and `EvidenceRepository` from `main` without renaming any method.

- [ ] **Step 4: Regenerate the lockfile**

Run `npm install --package-lock-only` from `web` after conflict markers are removed from `package.json`. Expected: exit code 0 and no conflict markers in `package-lock.json`.

### Task 2: Supply the missing evidence persistence adapter

**Files:**
- Create: `web/src/services/repositories/supabase-evidence-repository.ts`
- Modify: `web/src/services/repositories/in-memory.ts`
- Modify: `web/src/services/repositories/supabase-repositories.test.ts`
- Modify: `web/src/services/repositories/in-memory.test.ts`
- Modify: `web/supabase/migrations/202608290002_evidence.sql`
- Regenerate: `web/src/lib/database.types.ts`

**Interfaces:**
- Consumes: `EvidenceRepository`, the `evidence_records` table, and the server-only Supabase admin client
- Produces: `SupabaseEvidenceRepository` and `InMemoryEvidenceRepository`

- [ ] **Step 1: Add failing persistence tests**

Test that the Supabase adapter maps camelCase input to snake_case columns, returns a mapped record, lists records by product in ascending creation order, and converts a missing product foreign-key error to `PRODUCT_NOT_FOUND`. Test that the in-memory adapter clones stored and returned evidence.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run `npm test -- src/services/repositories/supabase-repositories.test.ts src/services/repositories/in-memory.test.ts`. Expected: failure because the evidence adapters do not exist.

- [ ] **Step 3: Implement both adapters**

Validate Supabase rows with Zod before mapping. Wrap unexpected create and list errors as `EVIDENCE_REPOSITORY_CREATE_FAILED` and `EVIDENCE_REPOSITORY_LIST_FAILED`. Store and return structured clones in memory.

- [ ] **Step 4: Complete evidence table access controls**

Add a deny policy for `anon` and `authenticated`, matching the Role 1 service-only table pattern.

- [ ] **Step 5: Apply migrations and regenerate types**

Run `npx supabase db reset`, `npx supabase db lint`, and `npx supabase gen types typescript --local`. Replace `database.types.ts` with the generated output after removing only the CLI connection banner.

- [ ] **Step 6: Run focused repository tests**

Run `npm test -- src/services/repositories`. Expected: all repository tests pass.

### Task 3: Compose real dependencies and route orchestration

**Files:**
- Modify: `web/src/services/container.ts`
- Delete: `web/src/services/application.ts`
- Delete: `web/src/services/application.test.ts`
- Modify: `web/src/app/api/products/[productId]/extract/route.ts`
- Modify: `web/src/app/api/products/[productId]/evaluate/route.ts`
- Modify: `web/src/app/api/products/[productId]/interviews/route.ts`
- Modify: `web/src/app/api/interviews/[sessionId]/answers/route.ts`
- Modify: `web/src/app/api/products/[productId]/simulate/route.ts`
- Modify: `web/src/app/api/market-signals/import/route.ts`
- Modify: `web/src/app/api/routes.test.ts`
- Modify: `web/src/services/container.test.ts`

**Interfaces:**
- Consumes: `analyzeProduct`, `loadIntelligence`, `evaluateListing`, `startInterview`, `answerInterview`, `simulateRecommendation`, and `importMarketSignals`
- Produces: route handlers backed by real composed dependencies and one cached dependency object

- [ ] **Step 1: Update route tests to mock orchestration boundaries**

Mock the imported service functions rather than a temporary `application` object. Keep assertions for extraction, evaluation, interview, simulation, market import, API envelopes, and passport download headers.

- [ ] **Step 2: Run route tests and confirm failure**

Run `npm test -- src/app/api/routes.test.ts`. Expected: failure while routes still call the temporary application stub.

- [ ] **Step 3: Resolve the container**

Return cached instances of `OpenAIAiGateway`, `OpenAIEmbeddingService`, `SupabaseProductRepository`, `SupabaseMarketRepository`, `SupabaseSessionRepository`, and `SupabaseEvidenceRepository`. Do not retain the temporary `application` property.

- [ ] **Step 4: Connect each route**

Follow Task 10 in the spec. Extraction calls `analyzeProduct`; evaluation loads intelligence, evaluates, and persists; interview routes load intelligence before invoking interview services; simulation calls `simulateRecommendation`; market import calls `importMarketSignals` and returns `{ importedCount }`.

- [ ] **Step 5: Remove the obsolete application stub**

Delete `application.ts` and its unavailable-service test after no imports remain.

- [ ] **Step 6: Run route and service tests**

Run `npm test -- src/app/api src/services/application-service.test.ts src/services/container.test.ts`. Expected: all selected tests pass.

### Task 4: Connect deterministic seeding to integrated services

**Files:**
- Modify: `web/src/data/seed-demo.ts`
- Modify: `web/src/data/seed-demo.test.ts`

**Interfaces:**
- Consumes: the dependency container, `importMarketSignals`, and `extractProductPassport`
- Produces: an idempotent seed command that imports market signals and extracts competitor passports without the temporary application stub

- [ ] **Step 1: Add a failing composition test**

Keep `seedDemoData` dependency-injected. Test its existing idempotency and weak CloudRun behavior while changing only the command entrypoint composition.

- [ ] **Step 2: Replace temporary application composition**

Build the `DemoSeedApplication` adapter in `main()` from `getApplicationDependencies()`. Import signals with `{ embeddings, market }`. Load each competitor product and call `extractProductPassport` with `{ ai, embeddings, products }`; throw `PRODUCT_NOT_FOUND` if an upserted identifier cannot be reloaded.

- [ ] **Step 3: Run seed tests**

Run `npm test -- src/data/seed-demo.test.ts`. Expected: all seed tests pass without network access.

### Task 5: Verify and finish the merge

**Files:**
- Inspect: all merged files

**Interfaces:**
- Consumes: the resolved integrated tree
- Produces: a clean merge commit pushed to `origin/feat/platform-data`

- [ ] **Step 1: Confirm conflict removal**

Run `git diff --name-only --diff-filter=U` and `rg -n "^(<<<<<<<|=======|>>>>>>>)" web docs`. Expected: no output.

- [ ] **Step 2: Run complete verification**

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. Expected: every command exits with code 0.

- [ ] **Step 3: Verify the merge scope**

Review `git status --short`, `git diff --cached --stat`, and the final conflict resolutions. Confirm no `.env`, Supabase temporary files, or generated build output are staged.

- [ ] **Step 4: Commit and push**

Create the merge commit with `git commit --no-edit`, then run `git push origin feat/platform-data`. Verify local `HEAD` equals `@{upstream}` and PR #1 reports `MERGEABLE` or a non-conflicting merge state.
