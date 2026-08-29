# AgentReady Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a RAG-powered seller coach that converts incomplete product listings into evidence-aware Product Passports, evaluates AI readiness and competitiveness, asks prioritized questions, and proves improvement through a before-and-after recommendation simulation.

**Architecture:** A Next.js 16.3.3 application owns the UI and Route Handler API. Domain logic remains in pure TypeScript modules, Supabase PostgreSQL stores relational and vector data, and OpenAI Structured Outputs create validated Product Passports and query intents. RAG supplies category context while deterministic functions calculate scores, gaps, question priority, hard-constraint eligibility, and ranking.

**Tech Stack:** Node.js 24 LTS, Next.js 16.3.3, React, TypeScript, Tailwind CSS, Supabase PostgreSQL, pgvector, OpenAI Responses API, Zod 4, Vitest, React Testing Library, Playwright, Vercel

**Spec:** docs/superpowers/specs/2026-08-29-agentready-coach-design.md

## Global Constraints

- Use Node.js 24 LTS and Next.js 16.3.3.
- Keep the web application under web/ because the repository root contains project documentation.
- Use npm and commit web/package-lock.json.
- Use strict TypeScript and Zod 4 validation at every external boundary.
- Use text-embedding-3-small with 1536-dimensional vectors.
- Keep OpenAI and Supabase service credentials on the server.
- Treat imported listings, queries, competitor observations, and uploaded evidence as untrusted input.
- Store each feature with one provenance status: verified, seller_declared, ai_inferred, or missing.
- Never turn competitor observations into seller product claims.
- Never let semantic similarity, brand popularity, or competitive ranking override hard constraints.
- Keep AI Readiness and Competitiveness as separate scores.
- Calculate all scores and question priorities deterministically.
- Use one initial category, running_shoes.
- Use permitted or supplied competitive observations and aggregated query data only.
- Do not automatically publish or modify an external seller account.
- Follow TDD for each domain behavior and route contract.
- Use one branch per role and merge into `integration/hackathon` before `main`.
- Treat `src/domain/**` and the interface map as a frozen contract after the foundation checkpoint.
- Only Role 1 edits `package.json`, lockfiles, database migrations, and Route Handler files.
- Only Role 3 edits shared domain contracts after the foundation checkpoint.
- Add tests beside the module owned by the role that implements it.

---

## Planned file structure

~~~text
docs/
  superpowers/
    specs/2026-08-29-agentready-coach-design.md
    plans/2026-08-29-agentready-coach.md
web/
  .env.example
  package.json
  vitest.config.ts
  playwright.config.ts
  supabase/
    migrations/202608290001_initial.sql
    seed.sql
  e2e/
    seller-optimization.spec.ts
  src/
    app/
      api/
        market-signals/import/route.ts
        products/route.ts
        products/[productId]/route.ts
        products/[productId]/extract/route.ts
        products/[productId]/evaluate/route.ts
        products/[productId]/export/route.ts
        products/[productId]/interviews/route.ts
        products/[productId]/simulate/route.ts
        interviews/[sessionId]/answers/route.ts
      products/new/page.tsx
      products/[productId]/page.tsx
      layout.tsx
      page.tsx
      globals.css
    components/
      before-after-panel.tsx
      evidence-badge.tsx
      gap-list.tsx
      import-listing-form.tsx
      market-insights.tsx
      product-passport-panel.tsx
      readiness-breakdown.tsx
      seller-chat.tsx
    data/
      running-shoes-category.json
      demo-market-signals.json
      demo-products.json
      demo-queries.json
    domain/
      evaluation.ts
      market.ts
      passport.ts
      recommendation.ts
    features/
      catalog/
        adapters.ts
        import-product.ts
      evaluation/
        build-gaps.ts
        competitiveness.ts
        evaluate-listing.ts
        readiness.ts
      extraction/
        extract-passport.ts
      interviews/
        answer-application.ts
        interview-service.ts
        question-priority.ts
      market/
        build-category-intelligence.ts
        import-market-signals.ts
        retrieve-market-context.ts
      recommendation/
        parse-query.ts
        rank-products.ts
        simulate-recommendation.ts
    lib/
      api-response.ts
      env.ts
      ids.ts
      openai.ts
      supabase-admin.ts
    services/
      embeddings.ts
      repositories/
        contracts.ts
        in-memory.ts
        supabase-market-repository.ts
        supabase-product-repository.ts
        supabase-session-repository.ts
    test/
      fixtures.ts
      setup.ts
~~~

## Interface map

~~~typescript
type CatalogSourceAdapter = {
  parse(input: string): RawProductInput[];
};

type ProductRepository = {
  create(input: RawProductInput): Promise<ProductRecord>;
  get(productId: string): Promise<ProductRecord | null>;
  listByCategory(category: string): Promise<ProductRecord[]>;
  savePassport(productId: string, passport: ProductPassport): Promise<void>;
  saveEmbedding(productId: string, embedding: number[]): Promise<void>;
  searchByEmbedding(
    category: string,
    embedding: number[],
    limit: number,
  ): Promise<Array<ProductRecord & { similarity: number }>>;
  saveEvaluation(productId: string, evaluation: ListingEvaluation): Promise<void>;
};

type MarketRepository = {
  saveSignals(signals: MarketSignal[]): Promise<void>;
  retrieve(category: string, query: string, embedding: number[], limit: number): Promise<MarketSignal[]>;
};

type SessionRepository = {
  create(productId: string): Promise<InterviewSession>;
  get(sessionId: string): Promise<InterviewSession | null>;
  appendMessage(sessionId: string, message: InterviewMessage): Promise<void>;
  markAsked(sessionId: string, featureKey: string): Promise<void>;
};

type EmbeddingService = {
  embed(texts: string[]): Promise<number[][]>;
};
~~~

### Task 1: Bootstrap the web application and quality gates

**Files:**

- Create: web/ using create-next-app
- Create: web/vitest.config.ts
- Create: web/src/test/setup.ts
- Create: web/src/app/page.test.tsx
- Modify: web/src/app/page.tsx
- Modify: web/package.json

**Interfaces:**

- Consumes: Node.js 24 LTS and npm
- Produces: a buildable Next.js 16.3.3 application with test, lint, type-check, and end-to-end scripts

- [ ] **Step 1: Verify the runtime**

Run:

~~~powershell
node --version
npm --version
~~~

Expected: Node reports a v24.x release. If another major version is active, select Node 24 LTS before continuing.

- [ ] **Step 2: Scaffold the application**

Run from the repository root:

~~~powershell
npx create-next-app@16.3.3 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
Set-Location web
npm install @supabase/supabase-js @supabase/ssr openai zod papaparse recharts lucide-react clsx tailwind-merge
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @types/papaparse tsx dotenv supabase
~~~

Expected: web/package.json and web/package-lock.json exist, and installation finishes without audit errors that block development.

- [ ] **Step 3: Configure Vitest and scripts**

Create web/vitest.config.ts:

~~~typescript
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
~~~

Create web/src/test/setup.ts:

~~~typescript
import "@testing-library/jest-dom/vitest";
~~~

Add these scripts to web/package.json:

~~~json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "e2e": "playwright test"
  }
}
~~~

- [ ] **Step 4: Write the failing landing-page test**

Create web/src/app/page.test.tsx:

~~~typescript
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("introduces AgentReady Coach", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "AgentReady Coach" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/teach every product how to answer an AI shopper/i),
    ).toBeInTheDocument();
  });
});
~~~

- [ ] **Step 5: Run the test to verify it fails**

Run:

~~~powershell
npm test -- src/app/page.test.tsx
~~~

Expected: FAIL because the generated home page does not contain the required heading and proposition.

- [ ] **Step 6: Implement the minimal landing page**

Replace web/src/app/page.tsx with:

~~~tsx
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
~~~

- [ ] **Step 7: Verify the application**

Run:

~~~powershell
npm test
npm run typecheck
npm run lint
npm run build
~~~

Expected: all commands exit with code 0.

- [ ] **Step 8: Initialize version control and commit**

Run from the repository root:

~~~powershell
git init
git add docs web
git commit -m "chore: bootstrap AgentReady Coach"
~~~

Expected: the initial commit contains documentation, the scaffold, lockfile, and test configuration.

### Task 2: Define validated domain contracts and fixtures

**Files:**

- Create: web/src/domain/passport.ts
- Create: web/src/domain/market.ts
- Create: web/src/domain/evaluation.ts
- Create: web/src/domain/recommendation.ts
- Create: web/src/test/fixtures.ts
- Create: web/src/domain/passport.test.ts
- Create: web/src/domain/market.test.ts

**Interfaces:**

- Consumes: Zod 4
- Produces: ProductPassport, FeatureDefinition, CategoryIntelligence, ListingEvaluation, QueryIntent, and RecommendationResult schemas and inferred TypeScript types

- [ ] **Step 1: Write failing Product Passport schema tests**

Create web/src/domain/passport.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { ProductPassportSchema } from "./passport";

const validPassport = {
  productId: "product-cloudrun",
  name: "CloudRun Pro",
  category: "running_shoes",
  description: "Lightweight road running shoe",
  price: 179,
  currency: "SGD",
  features: [
    {
      key: "weight",
      label: "Weight",
      value: 220,
      unit: "g",
      status: "verified",
      confidence: 0.95,
      evidenceIds: ["evidence-weight"],
    },
  ],
  useCases: ["half_marathon"],
  suitableContexts: ["humid_weather"],
  limitations: [],
  updatedAt: "2026-08-29T00:00:00.000Z",
};

describe("ProductPassportSchema", () => {
  it("accepts a valid passport", () => {
    expect(ProductPassportSchema.parse(validPassport)).toEqual(validPassport);
  });

  it("rejects confidence above one", () => {
    const invalid = structuredClone(validPassport);
    invalid.features[0].confidence = 1.1;

    expect(() => ProductPassportSchema.parse(invalid)).toThrow();
  });

  it("rejects an unknown provenance status", () => {
    const invalid = structuredClone(validPassport) as Record<string, unknown>;
    const features = invalid.features as Array<Record<string, unknown>>;
    features[0].status = "competitor_claim";

    expect(() => ProductPassportSchema.parse(invalid)).toThrow();
  });
});
~~~

- [ ] **Step 2: Run the Product Passport tests to verify failure**

Run:

~~~powershell
npm test -- src/domain/passport.test.ts
~~~

Expected: FAIL because web/src/domain/passport.ts does not exist.

- [ ] **Step 3: Implement the Product Passport schema**

Create web/src/domain/passport.ts:

~~~typescript
import { z } from "zod";

export const EvidenceStatusSchema = z.enum([
  "verified",
  "seller_declared",
  "ai_inferred",
  "missing",
]);

export const FeatureScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const FeatureValueSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: FeatureScalarSchema.nullable(),
  unit: z.string().nullable(),
  status: EvidenceStatusSchema,
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()),
});

export const ProductPassportSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  features: z.array(FeatureValueSchema),
  useCases: z.array(z.string()),
  suitableContexts: z.array(z.string()),
  limitations: z.array(z.string()),
  updatedAt: z.string().datetime(),
});

export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type FeatureValue = z.infer<typeof FeatureValueSchema>;
export type ProductPassport = z.infer<typeof ProductPassportSchema>;
~~~

- [ ] **Step 4: Write failing market and evaluation schema tests**

Create web/src/domain/market.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import {
  CategoryIntelligenceSchema,
  QueryIntentSchema,
} from "./market";

describe("market schemas", () => {
  it("accepts structured buyer intent", () => {
    const parsed = QueryIntentSchema.parse({
      category: "running_shoes",
      goal: "half_marathon",
      hardConstraints: { price_max: 200 },
      preferences: ["lightweight"],
      contexts: ["humid_weather"],
    });

    expect(parsed.hardConstraints.price_max).toBe(200);
  });

  it("requires normalized feature weights", () => {
    expect(() =>
      CategoryIntelligenceSchema.parse({
        category: "running_shoes",
        features: [
          {
            key: "weight",
            label: "Weight",
            dataType: "number",
            unit: "g",
            required: true,
            demandWeight: 1.2,
            constraintImportance: 1,
            competitiveCoverage: 0.8,
            competitiveDirection: "lower",
            answerability: 1,
            evidenceRequired: true,
            synonyms: ["lightweight"],
          },
        ],
        intents: [],
        peerMedians: {},
        peerPriceMedian: null,
      }),
    ).toThrow();
  });
});
~~~

- [ ] **Step 5: Implement market contracts**

Create web/src/domain/market.ts:

~~~typescript
import { z } from "zod";

export const ConstraintValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const QueryIntentSchema = z.object({
  category: z.string().min(1),
  goal: z.string().nullable(),
  hardConstraints: z.record(z.string(), ConstraintValueSchema),
  preferences: z.array(z.string()),
  contexts: z.array(z.string()),
});

export const FeatureDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  dataType: z.enum(["string", "number", "boolean", "string_array"]),
  unit: z.string().nullable(),
  required: z.boolean(),
  demandWeight: z.number().min(0).max(1),
  constraintImportance: z.number().min(0).max(1),
  competitiveCoverage: z.number().min(0).max(1),
  competitiveDirection: z.enum(["lower", "higher", "neutral"]),
  answerability: z.number().min(0).max(1),
  evidenceRequired: z.boolean(),
  synonyms: z.array(z.string()),
});

export const BenchmarkIntentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().positive(),
  requiredFeatures: z.array(z.string()),
  preferredFeatures: z.array(z.string()),
});

export const CategoryIntelligenceSchema = z.object({
  category: z.string().min(1),
  features: z.array(FeatureDefinitionSchema),
  intents: z.array(BenchmarkIntentSchema),
  peerMedians: z.record(z.string(), z.number()),
  peerPriceMedian: z.number().nonnegative().nullable(),
});

export const MarketSignalSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  signalType: z.enum(["user_query", "competitor_observation"]),
  rawText: z.string().min(1),
  parsedIntent: QueryIntentSchema.nullable(),
  featureKeys: z.array(z.string()),
  featureValues: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  frequency: z.number().nonnegative(),
  sourceLabel: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  observedAt: z.string().datetime(),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
export type BenchmarkIntent = z.infer<typeof BenchmarkIntentSchema>;
export type CategoryIntelligence = z.infer<typeof CategoryIntelligenceSchema>;
export type MarketSignal = z.infer<typeof MarketSignalSchema>;
~~~

- [ ] **Step 6: Implement evaluation and recommendation contracts**

Create web/src/domain/evaluation.ts:

~~~typescript
import { z } from "zod";

export const ScoreBreakdownSchema = z.object({
  completeness: z.number().min(0).max(100),
  intentCoverage: z.number().min(0).max(100),
  evidenceQuality: z.number().min(0).max(100),
  discoverability: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

export const CompetitivenessBreakdownSchema = z.object({
  peerFeatureCoverage: z.number().min(0).max(100),
  differentiation: z.number().min(0).max(100),
  relativeSpecifications: z.number().min(0).max(100),
  priceFit: z.number().min(0).max(100),
  highDemandQueryCoverage: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});

export const GapSchema = z.object({
  featureKey: z.string().min(1),
  label: z.string().min(1),
  reason: z.enum([
    "missing",
    "low_confidence",
    "evidence_required",
    "competitive_gap",
  ]),
  priority: z.number().min(0).max(100),
  question: z.string().min(1),
  evidenceRequested: z.boolean(),
});

export const ListingEvaluationSchema = z.object({
  readiness: ScoreBreakdownSchema,
  competitiveness: CompetitivenessBreakdownSchema,
  gaps: z.array(GapSchema),
  coveredIntentIds: z.array(z.string()),
  generatedAt: z.string().datetime(),
  scoringVersion: z.literal("1.0.0"),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type CompetitivenessBreakdown = z.infer<
  typeof CompetitivenessBreakdownSchema
>;
export type Gap = z.infer<typeof GapSchema>;
export type ListingEvaluation = z.infer<typeof ListingEvaluationSchema>;
~~~

Create web/src/domain/recommendation.ts:

~~~typescript
import { z } from "zod";
import { QueryIntentSchema } from "./market";

export const RecommendationCandidateSchema = z.object({
  productId: z.string(),
  eligible: z.boolean(),
  rank: z.number().int().positive().nullable(),
  fitScore: z.number().min(0).max(100),
  matchedFacts: z.array(z.string()),
  failedConstraints: z.array(z.string()),
  missingEvidence: z.array(z.string()),
});

export const RecommendationResultSchema = z.object({
  query: z.string().min(1),
  intent: QueryIntentSchema,
  candidates: z.array(RecommendationCandidateSchema),
  scoringVersion: z.literal("1.0.0"),
});

export type RecommendationCandidate = z.infer<
  typeof RecommendationCandidateSchema
>;
export type RecommendationResult = z.infer<
  typeof RecommendationResultSchema
>;
~~~

- [ ] **Step 7: Add reusable fixtures**

Create web/src/test/fixtures.ts with functions that return new objects on every call:

~~~typescript
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

export function makePassport(
  overrides: Partial<ProductPassport> = {},
): ProductPassport {
  return {
    productId: "product-cloudrun",
    name: "CloudRun Pro",
    category: "running_shoes",
    description: "Lightweight road running shoe",
    price: 179,
    currency: "SGD",
    features: [],
    useCases: [],
    suitableContexts: [],
    limitations: [],
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

export function makeCategoryIntelligence(): CategoryIntelligence {
  return {
    category: "running_shoes",
    features: [
      {
        key: "weight",
        label: "Measured weight",
        dataType: "number",
        unit: "g",
        required: true,
        demandWeight: 0.9,
        constraintImportance: 0.8,
        competitiveCoverage: 0.75,
        competitiveDirection: "lower",
        answerability: 1,
        evidenceRequired: true,
        synonyms: ["lightweight", "grams"],
      },
      {
        key: "breathability",
        label: "Breathability",
        dataType: "string",
        unit: null,
        required: false,
        demandWeight: 0.8,
        constraintImportance: 0.7,
        competitiveCoverage: 0.6,
        competitiveDirection: "neutral",
        answerability: 0.8,
        evidenceRequired: true,
        synonyms: ["ventilated", "airflow"],
      },
    ],
    intents: [
      {
        id: "humid-half-marathon",
        label: "Humid-weather half-marathon training",
        weight: 10,
        requiredFeatures: ["weight"],
        preferredFeatures: ["breathability"],
      },
    ],
    peerMedians: { weight: 245 },
    peerPriceMedian: 189,
  };
}
~~~

- [ ] **Step 8: Run domain tests**

Run:

~~~powershell
npm test -- src/domain
npm run typecheck
~~~

Expected: all domain tests pass and TypeScript reports no errors.

- [ ] **Step 9: Commit the domain contracts**

Run:

~~~powershell
git add web/src/domain web/src/test
git commit -m "feat: define product intelligence contracts"
~~~

Expected: one commit containing schemas, types, tests, and fixtures.

### Task 3: Implement deterministic evaluation and gap prioritization

**Files:**

- Create: web/src/features/evaluation/readiness.ts
- Create: web/src/features/evaluation/competitiveness.ts
- Create: web/src/features/evaluation/build-gaps.ts
- Create: web/src/features/evaluation/evaluate-listing.ts
- Create: web/src/features/evaluation/evaluate-listing.test.ts
- Create: web/src/features/interviews/question-priority.ts
- Create: web/src/features/interviews/question-priority.test.ts

**Interfaces:**

- Consumes: ProductPassport and CategoryIntelligence
- Produces: scoreReadiness(passport, intelligence), scoreCompetitiveness(passport, intelligence), buildGaps(passport, intelligence), evaluateListing(passport, intelligence, now), and selectNextGap(gaps, askedFeatureKeys)

- [ ] **Step 1: Write failing evaluation tests**

Create web/src/features/evaluation/evaluate-listing.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { makeCategoryIntelligence, makePassport } from "@/test/fixtures";
import { evaluateListing } from "./evaluate-listing";

describe("evaluateListing", () => {
  it("reports missing high-demand features", () => {
    const evaluation = evaluateListing(
      makePassport(),
      makeCategoryIntelligence(),
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(evaluation.gaps.map((gap) => gap.featureKey)).toEqual([
      "weight",
      "breathability",
    ]);
    expect(evaluation.readiness.total).toBeLessThan(50);
  });

  it("rewards verified feature coverage", () => {
    const passport = makePassport({
      features: [
        {
          key: "weight",
          label: "Measured weight",
          value: 220,
          unit: "g",
          status: "verified",
          confidence: 0.95,
          evidenceIds: ["weight-spec"],
        },
        {
          key: "breathability",
          label: "Breathability",
          value: "high",
          unit: null,
          status: "verified",
          confidence: 0.9,
          evidenceIds: ["mesh-spec"],
        },
      ],
    });

    const evaluation = evaluateListing(
      passport,
      makeCategoryIntelligence(),
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(evaluation.gaps).toHaveLength(0);
    expect(evaluation.readiness.completeness).toBe(100);
    expect(evaluation.readiness.evidenceQuality).toBe(100);
    expect(evaluation.coveredIntentIds).toEqual(["humid-half-marathon"]);
  });
});
~~~

- [ ] **Step 2: Run the evaluation test to verify failure**

Run:

~~~powershell
npm test -- src/features/evaluation/evaluate-listing.test.ts
~~~

Expected: FAIL because evaluate-listing.ts does not exist.

- [ ] **Step 3: Implement AI Readiness scoring**

Create web/src/features/evaluation/readiness.ts:

~~~typescript
import type { ScoreBreakdown } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { FeatureValue, ProductPassport } from "@/domain/passport";

const evidenceFactor = {
  verified: 1,
  seller_declared: 0.6,
  ai_inferred: 0.25,
  missing: 0,
} as const;

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function present(feature: FeatureValue | undefined): boolean {
  return Boolean(feature && feature.value !== null && feature.status !== "missing");
}

export function scoreReadiness(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
): ScoreBreakdown & { coveredIntentIds: string[] } {
  const features = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );
  const totalWeight =
    intelligence.features.reduce(
      (sum, feature) => sum + Math.max(feature.demandWeight, 0.1),
      0,
    ) || 1;
  const completeness = roundScore(
    (100 *
      intelligence.features.reduce(
        (sum, definition) =>
          sum +
          (present(features.get(definition.key))
            ? Math.max(definition.demandWeight, 0.1)
            : 0),
        0,
      )) /
      totalWeight,
  );
  const evidenceQuality = roundScore(
    (100 *
      intelligence.features.reduce((sum, definition) => {
        const feature = features.get(definition.key);
        const factor = feature ? evidenceFactor[feature.status] : 0;
        return sum + Math.max(definition.demandWeight, 0.1) * factor;
      }, 0)) /
      totalWeight,
  );
  const coveredIntentIds = intelligence.intents
    .filter((intent) => {
      const requiredCovered = intent.requiredFeatures.every((key) =>
        present(features.get(key)),
      );
      const preferredCovered =
        intent.preferredFeatures.length === 0 ||
        intent.preferredFeatures.some((key) => present(features.get(key)));
      return requiredCovered && preferredCovered;
    })
    .map((intent) => intent.id);
  const totalIntentWeight =
    intelligence.intents.reduce((sum, intent) => sum + intent.weight, 0) || 1;
  const intentCoverage = roundScore(
    (100 *
      intelligence.intents
        .filter((intent) => coveredIntentIds.includes(intent.id))
        .reduce((sum, intent) => sum + intent.weight, 0)) /
      totalIntentWeight,
  );
  const searchableText = [
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
  ]
    .join(" ")
    .toLowerCase();
  const discoverability = roundScore(
    (100 *
      intelligence.features.reduce((sum, definition) => {
        const represented =
          present(features.get(definition.key)) ||
          definition.synonyms.some((term) =>
            searchableText.includes(term.toLowerCase()),
          );
        return sum + (represented ? Math.max(definition.demandWeight, 0.1) : 0);
      }, 0)) /
      totalWeight,
  );
  const duplicateKeys = passport.features.length - features.size;
  const missingCurrencyPenalty =
    passport.price !== null && passport.currency === null ? 15 : 0;
  const consistency = roundScore(
    100 - duplicateKeys * 20 - missingCurrencyPenalty,
  );
  const total = roundScore(
    0.3 * completeness +
      0.25 * intentCoverage +
      0.2 * evidenceQuality +
      0.15 * discoverability +
      0.1 * consistency,
  );

  return {
    completeness,
    intentCoverage,
    evidenceQuality,
    discoverability,
    consistency,
    total,
    coveredIntentIds,
  };
}
~~~

- [ ] **Step 4: Implement Competitiveness scoring**

Create web/src/features/evaluation/competitiveness.ts:

~~~typescript
import type { CompetitivenessBreakdown } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function scoreCompetitiveness(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
  highDemandQueryCoverage: number,
): CompetitivenessBreakdown {
  const featureMap = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );
  const competitiveDefinitions = intelligence.features.filter(
    (feature) => feature.competitiveCoverage >= 0.5,
  );
  const peerFeatureCoverage = roundScore(
    competitiveDefinitions.length === 0
      ? 100
      : (100 *
          competitiveDefinitions.filter(
            (definition) =>
              featureMap.get(definition.key)?.value !== null &&
              featureMap.get(definition.key)?.status !== "missing",
          ).length) /
          competitiveDefinitions.length,
  );
  const differentiatingDefinitions = intelligence.features.filter(
    (feature) => feature.competitiveCoverage < 0.5,
  );
  const differentiation = roundScore(
    differentiatingDefinitions.length === 0
      ? 50
      : (100 *
          differentiatingDefinitions.filter(
            (definition) =>
              featureMap.get(definition.key)?.value !== null &&
              ["verified", "seller_declared"].includes(
                featureMap.get(definition.key)?.status ?? "missing",
              ),
          ).length) /
          differentiatingDefinitions.length,
  );
  const comparableScores = Object.entries(intelligence.peerMedians).flatMap(
    ([key, median]) => {
      const definition = intelligence.features.find(
        (feature) => feature.key === key,
      );
      const value = featureMap.get(key)?.value;
      if (!definition || typeof value !== "number" || median <= 0) {
        return [];
      }
      if (definition.competitiveDirection === "lower") {
        return [value <= median ? 100 : (100 * median) / value];
      }
      if (definition.competitiveDirection === "higher") {
        return [value >= median ? 100 : (100 * value) / median];
      }
      return [100];
    },
  );
  const relativeSpecifications = roundScore(
    comparableScores.length === 0
      ? 50
      : comparableScores.reduce((sum, value) => sum + value, 0) /
          comparableScores.length,
  );
  const priceFit = roundScore(
    passport.price === null || intelligence.peerPriceMedian === null
      ? 50
      : passport.price <= intelligence.peerPriceMedian
        ? 100
        : (100 * intelligence.peerPriceMedian) / passport.price,
  );
  const total = roundScore(
    0.35 * peerFeatureCoverage +
      0.25 * differentiation +
      0.2 * relativeSpecifications +
      0.1 * priceFit +
      0.1 * highDemandQueryCoverage,
  );

  return {
    peerFeatureCoverage,
    differentiation,
    relativeSpecifications,
    priceFit,
    highDemandQueryCoverage,
    total,
  };
}
~~~

- [ ] **Step 5: Implement gap creation and question priority**

Create web/src/features/evaluation/build-gaps.ts:

~~~typescript
import type { Gap } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

function roundPriority(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function buildGaps(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
): Gap[] {
  const features = new Map(
    passport.features.map((feature) => [feature.key, feature]),
  );

  return intelligence.features
    .flatMap((definition): Gap[] => {
      const feature = features.get(definition.key);
      const missing =
        !feature || feature.value === null || feature.status === "missing";
      const evidenceMissing =
        definition.evidenceRequired &&
        feature !== undefined &&
        feature.value !== null &&
        feature.evidenceIds.length === 0;
      const lowConfidence =
        feature !== undefined &&
        feature.value !== null &&
        feature.confidence < 0.6;
      if (!missing && !evidenceMissing && !lowConfidence) {
        return [];
      }
      const confidenceGap = feature ? 1 - feature.confidence : 1;
      const priority = roundPriority(
        100 *
          (0.35 * definition.demandWeight +
            0.3 * definition.constraintImportance +
            0.2 * definition.competitiveCoverage +
            0.15 * confidenceGap) *
          definition.answerability,
      );
      const reason = missing
        ? "missing"
        : evidenceMissing
          ? "evidence_required"
          : "low_confidence";
      const evidenceRequested =
        definition.evidenceRequired &&
        (missing || evidenceMissing || feature?.status === "ai_inferred");
      const suffix = evidenceRequested
        ? " Please provide a specification or other supporting evidence if available."
        : "";

      return [
        {
          featureKey: definition.key,
          label: definition.label,
          reason,
          priority,
          question: "What is the " + definition.label.toLowerCase() + " for this product?" + suffix,
          evidenceRequested,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.featureKey.localeCompare(right.featureKey),
    );
}
~~~

Create web/src/features/interviews/question-priority.ts:

~~~typescript
import type { Gap } from "@/domain/evaluation";

export function selectNextGap(
  gaps: Gap[],
  askedFeatureKeys: string[],
): Gap | null {
  const asked = new Set(askedFeatureKeys);
  return (
    [...gaps]
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          left.featureKey.localeCompare(right.featureKey),
      )
      .find((gap) => !asked.has(gap.featureKey)) ?? null
  );
}
~~~

- [ ] **Step 6: Implement the evaluation orchestrator**

Create web/src/features/evaluation/evaluate-listing.ts:

~~~typescript
import type { ListingEvaluation } from "@/domain/evaluation";
import type { CategoryIntelligence } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import { buildGaps } from "./build-gaps";
import { scoreCompetitiveness } from "./competitiveness";
import { scoreReadiness } from "./readiness";

export function evaluateListing(
  passport: ProductPassport,
  intelligence: CategoryIntelligence,
  now: Date = new Date(),
): ListingEvaluation {
  const readinessResult = scoreReadiness(passport, intelligence);
  const { coveredIntentIds, ...readiness } = readinessResult;

  return {
    readiness,
    competitiveness: scoreCompetitiveness(
      passport,
      intelligence,
      readiness.intentCoverage,
    ),
    gaps: buildGaps(passport, intelligence),
    coveredIntentIds,
    generatedAt: now.toISOString(),
    scoringVersion: "1.0.0",
  };
}
~~~

- [ ] **Step 7: Write and run question selection tests**

Create web/src/features/interviews/question-priority.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import type { Gap } from "@/domain/evaluation";
import { selectNextGap } from "./question-priority";

const gaps: Gap[] = [
  {
    featureKey: "weight",
    label: "Weight",
    reason: "missing",
    priority: 90,
    question: "What is the weight?",
    evidenceRequested: true,
  },
  {
    featureKey: "terrain",
    label: "Terrain",
    reason: "missing",
    priority: 70,
    question: "What is the terrain?",
    evidenceRequested: false,
  },
];

describe("selectNextGap", () => {
  it("returns the highest-priority unanswered gap", () => {
    expect(selectNextGap(gaps, [])?.featureKey).toBe("weight");
    expect(selectNextGap(gaps, ["weight"])?.featureKey).toBe("terrain");
    expect(selectNextGap(gaps, ["weight", "terrain"])).toBeNull();
  });
});
~~~

Run:

~~~powershell
npm test -- src/features/evaluation src/features/interviews/question-priority.test.ts
npm run typecheck
~~~

Expected: all tests pass.

- [ ] **Step 8: Commit deterministic evaluation**

Run:

~~~powershell
git add web/src/features/evaluation web/src/features/interviews/question-priority*
git commit -m "feat: score listings and prioritize gaps"
~~~

### Task 4: Create the Supabase schema and repository boundaries

**Files:**

- Create: web/supabase/migrations/202608290001_initial.sql
- Create: web/src/lib/env.ts
- Create: web/src/lib/supabase-admin.ts
- Create: web/src/services/repositories/contracts.ts
- Create: web/src/services/repositories/in-memory.ts
- Create: web/src/services/repositories/in-memory.test.ts
- Create: web/src/services/repositories/supabase-product-repository.ts
- Create: web/src/services/repositories/supabase-market-repository.ts
- Create: web/src/services/repositories/supabase-session-repository.ts
- Create: web/.env.example

**Interfaces:**

- Consumes: domain contracts
- Produces: server-only ProductRepository, MarketRepository, and SessionRepository implementations with a database migration

- [ ] **Step 1: Write repository contract tests against an in-memory implementation**

Create web/src/services/repositories/in-memory.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "./in-memory";

describe("InMemoryProductRepository", () => {
  it("creates and retrieves a product without sharing mutable state", async () => {
    const repository = new InMemoryProductRepository();
    const created = await repository.create({
      externalId: "cloudrun",
      name: "CloudRun Pro",
      category: "running_shoes",
      rawListing: "Lightweight running shoe",
      price: 179,
      currency: "SGD",
      sourceType: "text",
    });

    const loaded = await repository.get(created.id);
    expect(loaded?.name).toBe("CloudRun Pro");
    loaded!.name = "Changed outside repository";
    expect((await repository.get(created.id))?.name).toBe("CloudRun Pro");
  });
});
~~~

- [ ] **Step 2: Implement repository contracts and in-memory repositories**

Create web/src/services/repositories/contracts.ts with:

~~~typescript
import type { ListingEvaluation } from "@/domain/evaluation";
import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

export type RawProductInput = {
  externalId: string | null;
  name: string;
  category: string;
  rawListing: string;
  price: number | null;
  currency: string | null;
  sourceType: "text" | "json" | "csv" | "challenge_database";
};

export type ProductRecord = RawProductInput & {
  id: string;
  passport: ProductPassport | null;
  originalPassport: ProductPassport | null;
  evaluation: ListingEvaluation | null;
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
};

export type InterviewMessage = {
  id: string;
  role: "assistant" | "seller";
  content: string;
  featureKey: string | null;
  createdAt: string;
};

export type InterviewSession = {
  id: string;
  productId: string;
  askedFeatureKeys: string[];
  messages: InterviewMessage[];
  createdAt: string;
};

export interface ProductRepository {
  create(input: RawProductInput): Promise<ProductRecord>;
  get(productId: string): Promise<ProductRecord | null>;
  listByCategory(category: string): Promise<ProductRecord[]>;
  savePassport(productId: string, passport: ProductPassport): Promise<void>;
  saveEmbedding(productId: string, embedding: number[]): Promise<void>;
  searchByEmbedding(
    category: string,
    embedding: number[],
    limit: number,
  ): Promise<Array<ProductRecord & { similarity: number }>>;
  saveEvaluation(
    productId: string,
    evaluation: ListingEvaluation,
  ): Promise<void>;
}

export interface MarketRepository {
  saveSignals(signals: MarketSignal[], embeddings: number[][]): Promise<void>;
  retrieve(
    category: string,
    query: string,
    embedding: number[],
    limit: number,
  ): Promise<MarketSignal[]>;
}

export interface SessionRepository {
  create(productId: string): Promise<InterviewSession>;
  get(sessionId: string): Promise<InterviewSession | null>;
  appendMessage(
    sessionId: string,
    message: InterviewMessage,
  ): Promise<void>;
  markAsked(sessionId: string, featureKey: string): Promise<void>;
}
~~~

Create web/src/services/repositories/in-memory.ts with Map-backed implementations. Clone every value through structuredClone when saving or returning. Generate identifiers with crypto.randomUUID(), preserve originalPassport only on the first savePassport call, and throw a descriptive error when an unknown product or session is updated.

- [ ] **Step 3: Run repository tests**

Run:

~~~powershell
npm test -- src/services/repositories/in-memory.test.ts
~~~

Expected: PASS.

- [ ] **Step 4: Add environment validation**

Create web/.env.example:

~~~dotenv
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
OPENAI_API_KEY=replace-with-openai-key
OPENAI_EXTRACTION_MODEL=gpt-5.6-luna
OPENAI_QUERY_MODEL=gpt-5.6-luna
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
~~~

Create web/src/lib/env.ts:

~~~typescript
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_EXTRACTION_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  OPENAI_QUERY_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default(
    "text-embedding-3-small",
  ),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_EXTRACTION_MODEL: process.env.OPENAI_EXTRACTION_MODEL,
  OPENAI_QUERY_MODEL: process.env.OPENAI_QUERY_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
});
~~~

Create web/src/lib/supabase-admin.ts:

~~~typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
~~~

- [ ] **Step 5: Create the initial database migration**

Create web/supabase/migrations/202608290001_initial.sql:

~~~sql
create extension if not exists vector with schema extensions;

create table categories (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table feature_definitions (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references categories(slug),
  feature_key text not null,
  label text not null,
  data_type text not null check (
    data_type in ('string', 'number', 'boolean', 'string_array')
  ),
  unit text,
  required boolean not null default false,
  demand_weight double precision not null check (demand_weight between 0 and 1),
  constraint_importance double precision not null check (
    constraint_importance between 0 and 1
  ),
  competitive_coverage double precision not null check (
    competitive_coverage between 0 and 1
  ),
  competitive_direction text not null check (
    competitive_direction in ('lower', 'higher', 'neutral')
  ),
  answerability double precision not null check (answerability between 0 and 1),
  evidence_required boolean not null default false,
  synonyms text[] not null default '{}',
  unique (category_slug, feature_key)
);

create table market_signals (
  id text primary key,
  category_slug text not null references categories(slug),
  signal_type text not null check (
    signal_type in ('user_query', 'competitor_observation')
  ),
  raw_text text not null,
  parsed_intent jsonb,
  feature_keys text[] not null default '{}',
  feature_values jsonb not null default '{}',
  frequency integer not null default 1 check (frequency >= 0),
  source_label text not null,
  source_url text,
  observed_at timestamptz not null,
  embedding extensions.vector(1536) not null,
  fts tsvector generated always as (
    to_tsvector('english', raw_text || ' ' || array_to_string(feature_keys, ' '))
  ) stored
);

create index market_signals_category_idx on market_signals(category_slug);
create index market_signals_fts_idx on market_signals using gin(fts);
create index market_signals_embedding_idx on market_signals
using hnsw (embedding vector_cosine_ops);

create table products (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  category_slug text not null references categories(slug),
  raw_listing text not null,
  price numeric,
  currency text,
  source_type text not null,
  passport jsonb,
  original_passport jsonb,
  evaluation jsonb,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on products(category_slug);
create index products_embedding_idx on products
using hnsw (embedding vector_cosine_ops);

create or replace function match_products(
  query_category text,
  query_embedding extensions.vector(1536),
  result_limit integer
)
returns table (
  id uuid,
  similarity double precision
)
language sql
stable
as $function$
  select
    products.id,
    1 - (products.embedding <=> query_embedding) as similarity
  from products
  where products.category_slug = query_category
    and products.embedding is not null
  order by products.embedding <=> query_embedding
  limit result_limit;
$function$;

create table product_claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  feature_key text not null,
  value jsonb,
  unit text,
  status text not null check (
    status in ('verified', 'seller_declared', 'ai_inferred', 'missing')
  ),
  confidence double precision not null check (confidence between 0 and 1),
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, feature_key)
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  asked_feature_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table interview_messages (
  id uuid primary key,
  session_id uuid not null references interview_sessions(id) on delete cascade,
  role text not null check (role in ('assistant', 'seller')),
  content text not null,
  feature_key text,
  created_at timestamptz not null
);

create table recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  query text not null,
  intent jsonb not null,
  before_result jsonb not null,
  after_result jsonb not null,
  scoring_version text not null,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table feature_definitions enable row level security;
alter table market_signals enable row level security;
alter table products enable row level security;
alter table product_claims enable row level security;
alter table evaluations enable row level security;
alter table interview_sessions enable row level security;
alter table interview_messages enable row level security;
alter table recommendation_runs enable row level security;

create or replace function hybrid_market_search(
  query_category text,
  query_text text,
  query_embedding extensions.vector(1536),
  result_limit integer
)
returns table (
  id text,
  category_slug text,
  signal_type text,
  raw_text text,
  parsed_intent jsonb,
  feature_keys text[],
  feature_values jsonb,
  frequency integer,
  source_label text,
  source_url text,
  observed_at timestamptz,
  score double precision
)
language sql
stable
as $function$
  with semantic as (
    select
      market_signals.id,
      row_number() over (
        order by market_signals.embedding <=> query_embedding
      ) as rank
    from market_signals
    where market_signals.category_slug = query_category
    order by market_signals.embedding <=> query_embedding
    limit result_limit * 4
  ),
  lexical as (
    select
      market_signals.id,
      row_number() over (
        order by ts_rank_cd(
          market_signals.fts,
          websearch_to_tsquery('english', query_text)
        ) desc
      ) as rank
    from market_signals
    where market_signals.category_slug = query_category
      and market_signals.fts @@ websearch_to_tsquery('english', query_text)
    limit result_limit * 4
  ),
  fused as (
    select
      coalesce(semantic.id, lexical.id) as id,
      coalesce(1.0 / (60 + semantic.rank), 0.0)
        + coalesce(1.0 / (60 + lexical.rank), 0.0) as score
    from semantic
    full join lexical on semantic.id = lexical.id
  )
  select
    market_signals.id,
    market_signals.category_slug,
    market_signals.signal_type,
    market_signals.raw_text,
    market_signals.parsed_intent,
    market_signals.feature_keys,
    market_signals.feature_values,
    market_signals.frequency,
    market_signals.source_label,
    market_signals.source_url,
    market_signals.observed_at,
    fused.score
  from fused
  join market_signals on market_signals.id = fused.id
  order by fused.score desc
  limit result_limit;
$function$;
~~~

- [ ] **Step 6: Implement Supabase repositories**

Implement the three Supabase repository files against supabaseAdmin. Each write must validate domain payloads before persistence. Convert snake_case database rows into the camelCase contracts in contracts.ts. Market retrieval must call hybrid_market_search and validate every returned MarketSignal through MarketSignalSchema.

Use the following error pattern in each repository:

~~~typescript
if (error) {
  throw new Error("PRODUCT_REPOSITORY_CREATE_FAILED", { cause: error });
}
~~~

- [ ] **Step 7: Apply and verify the migration**

Run:

~~~powershell
npx supabase init
npx supabase start
npx supabase db reset
~~~

Expected: the local Supabase stack starts and the migration completes without SQL errors.

Run this SQL through the Supabase SQL shell:

~~~sql
select extname from pg_extension where extname = 'vector';
select proname from pg_proc where proname = 'hybrid_market_search';
~~~

Expected: one vector extension row and one hybrid_market_search function row.

- [ ] **Step 8: Verify and commit persistence**

Run:

~~~powershell
npm test -- src/services/repositories
npm run typecheck
npm run lint
git add web/.env.example web/supabase web/src/lib web/src/services/repositories
git commit -m "feat: add product intelligence persistence"
~~~

Expected: tests, type-check, and lint pass before the commit.

### Task 5: Implement catalog adapters and product import

**Files:**

- Create: web/src/features/catalog/adapters.ts
- Create: web/src/features/catalog/adapters.test.ts
- Create: web/src/features/catalog/import-product.ts
- Create: web/src/features/catalog/import-product.test.ts

**Interfaces:**

- Consumes: text, JSON, or CSV content and ProductRepository
- Produces: TextCatalogAdapter, JsonCatalogAdapter, CsvCatalogAdapter, and importProducts(adapter, input, repository)

- [ ] **Step 1: Write failing adapter tests**

Create web/src/features/catalog/adapters.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import {
  CsvCatalogAdapter,
  JsonCatalogAdapter,
  TextCatalogAdapter,
} from "./adapters";

describe("catalog adapters", () => {
  it("parses one pasted listing", () => {
    const products = new TextCatalogAdapter().parse(
      "CloudRun Pro\nLightweight running shoe\nPrice: S$179",
    );
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      name: "CloudRun Pro",
      category: "running_shoes",
      price: 179,
      currency: "SGD",
      sourceType: "text",
    });
  });

  it("parses a JSON product", () => {
    const products = new JsonCatalogAdapter().parse(
      JSON.stringify({
        id: "cloudrun",
        name: "CloudRun Pro",
        category: "running_shoes",
        description: "Lightweight shoe",
        price: 179,
        currency: "SGD",
      }),
    );
    expect(products[0].externalId).toBe("cloudrun");
  });

  it("reports the one-based row for invalid CSV data", () => {
    const input = "id,name,category,description,price,currency\n1,,running_shoes,Shoe,179,SGD";
    expect(() => new CsvCatalogAdapter().parse(input)).toThrow(
      "CSV row 2 is missing name",
    );
  });
});
~~~

- [ ] **Step 2: Run tests to verify failure**

Run:

~~~powershell
npm test -- src/features/catalog/adapters.test.ts
~~~

Expected: FAIL because adapters.ts does not exist.

- [ ] **Step 3: Implement the adapters**

Create web/src/features/catalog/adapters.ts:

~~~typescript
import Papa from "papaparse";
import type { RawProductInput } from "@/services/repositories/contracts";

export interface CatalogSourceAdapter {
  parse(input: string): RawProductInput[];
}

function moneyFromText(text: string): {
  price: number | null;
  currency: string | null;
} {
  const match = text.match(/(?:S\$|SGD\s*)(\d+(?:\.\d{1,2})?)/i);
  return match
    ? { price: Number(match[1]), currency: "SGD" }
    : { price: null, currency: null };
}

export class TextCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Listing text is empty");
    }
    const [firstLine] = trimmed.split(/\r?\n/);
    const money = moneyFromText(trimmed);
    return [
      {
        externalId: null,
        name: firstLine.trim(),
        category: "running_shoes",
        rawListing: trimmed,
        price: money.price,
        currency: money.currency,
        sourceType: "text",
      },
    ];
  }
}

export class JsonCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    const decoded = JSON.parse(input) as Record<string, unknown> | Array<Record<string, unknown>>;
    const rows = Array.isArray(decoded) ? decoded : [decoded];
    return rows.map((row, index) => {
      if (typeof row.name !== "string" || row.name.trim() === "") {
        throw new Error("JSON product " + (index + 1) + " is missing name");
      }
      return {
        externalId: typeof row.id === "string" ? row.id : null,
        name: row.name,
        category:
          typeof row.category === "string" ? row.category : "running_shoes",
        rawListing:
          typeof row.description === "string" ? row.description : row.name,
        price: typeof row.price === "number" ? row.price : null,
        currency: typeof row.currency === "string" ? row.currency : null,
        sourceType: "json",
      };
    });
  }
}

export class CsvCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    const result = Papa.parse<Record<string, string>>(input, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length > 0) {
      throw new Error("CSV parsing failed: " + result.errors[0].message);
    }
    return result.data.map((row, index) => {
      if (!row.name?.trim()) {
        throw new Error("CSV row " + (index + 2) + " is missing name");
      }
      const price = row.price?.trim() ? Number(row.price) : null;
      if (price !== null && !Number.isFinite(price)) {
        throw new Error("CSV row " + (index + 2) + " has invalid price");
      }
      return {
        externalId: row.id?.trim() || null,
        name: row.name.trim(),
        category: row.category?.trim() || "running_shoes",
        rawListing: row.description?.trim() || row.name.trim(),
        price,
        currency: row.currency?.trim() || null,
        sourceType: "csv",
      };
    });
  }
}
~~~

- [ ] **Step 4: Write and implement import-service tests**

Create web/src/features/catalog/import-product.test.ts. Use InMemoryProductRepository and CsvCatalogAdapter to import two rows, then assert both records exist and retain sourceType csv.

Create web/src/features/catalog/import-product.ts:

~~~typescript
import type { CatalogSourceAdapter } from "./adapters";
import type {
  ProductRecord,
  ProductRepository,
} from "@/services/repositories/contracts";

export async function importProducts(
  adapter: CatalogSourceAdapter,
  input: string,
  repository: ProductRepository,
): Promise<ProductRecord[]> {
  const parsed = adapter.parse(input);
  const products: ProductRecord[] = [];
  for (const product of parsed) {
    products.push(await repository.create(product));
  }
  return products;
}
~~~

- [ ] **Step 5: Verify and commit catalog import**

Run:

~~~powershell
npm test -- src/features/catalog
npm run typecheck
npm run lint
git add web/src/features/catalog
git commit -m "feat: import seller product listings"
~~~

Expected: all checks pass and the commit contains only catalog adapters and import orchestration.

### Task 6: Add OpenAI Structured Outputs and embeddings

**Files:**

- Create: web/src/lib/openai.ts
- Create: web/src/services/ai-gateway.ts
- Create: web/src/services/embeddings.ts
- Create: web/src/features/extraction/extract-passport.ts
- Create: web/src/features/extraction/extract-passport.test.ts
- Modify: web/src/services/repositories/in-memory.ts

**Interfaces:**

- Consumes: RawProductInput, ProductRepository, OpenAI Responses API, and OpenAI embeddings
- Produces: AiGateway, OpenAIAiGateway, EmbeddingService, OpenAIEmbeddingService, passportToSearchText(passport), and extractProductPassport(product, dependencies, now)

- [ ] **Step 1: Write a failing extraction-service test**

Create web/src/features/extraction/extract-passport.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "@/services/repositories/in-memory";
import type { AiGateway } from "@/services/ai-gateway";
import type { EmbeddingService } from "@/services/embeddings";
import { extractProductPassport } from "./extract-passport";

describe("extractProductPassport", () => {
  it("stores a validated passport, original snapshot, and embedding", async () => {
    const repository = new InMemoryProductRepository();
    const product = await repository.create({
      externalId: "cloudrun",
      name: "CloudRun Pro",
      category: "running_shoes",
      rawListing: "Lightweight running shoe. Price S$179.",
      price: 179,
      currency: "SGD",
      sourceType: "text",
    });
    const ai: AiGateway = {
      async extractProduct() {
        return {
          name: "CloudRun Pro",
          category: "running_shoes",
          description: "Lightweight running shoe",
          price: 179,
          currency: "SGD",
          features: [],
          useCases: [],
          suitableContexts: [],
          limitations: [],
        };
      },
      async parseQuery() {
        throw new Error("parseQuery is not used in this test");
      },
      async verifyEvidence() {
        throw new Error("verifyEvidence is not used in this test");
      },
    };
    const embeddings: EmbeddingService = {
      async embed() {
        return [Array.from({ length: 1536 }, () => 0.01)];
      },
    };

    await extractProductPassport(
      product,
      { ai, embeddings, products: repository },
      new Date("2026-08-29T00:00:00.000Z"),
    );

    const stored = await repository.get(product.id);
    expect(stored?.passport?.productId).toBe(product.id);
    expect(stored?.originalPassport).toEqual(stored?.passport);
    expect(stored?.embedding).toHaveLength(1536);
  });
});
~~~

- [ ] **Step 2: Run the extraction test to verify failure**

Run:

~~~powershell
npm test -- src/features/extraction/extract-passport.test.ts
~~~

Expected: FAIL because the AI gateway, embedding service, and extraction service do not exist.

- [ ] **Step 3: Implement the server OpenAI client and AI gateway**

Create web/src/lib/openai.ts:

~~~typescript
import "server-only";
import OpenAI from "openai";
import { env } from "./env";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
~~~

Create web/src/services/ai-gateway.ts:

~~~typescript
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { QueryIntentSchema, type QueryIntent } from "@/domain/market";
import {
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";
import type { RawProductInput } from "./repositories/contracts";
import { env } from "@/lib/env";
import { openai } from "@/lib/openai";

export const ProductPassportDraftSchema = ProductPassportSchema.omit({
  productId: true,
  updatedAt: true,
});

export type ProductPassportDraft = z.infer<
  typeof ProductPassportDraftSchema
>;

const EvidenceVerdictSchema = z.object({
  supported: z.boolean(),
  supportingExcerpt: z.string().nullable(),
  rationale: z.string(),
});

export type EvidenceVerdict = z.infer<typeof EvidenceVerdictSchema>;

export interface AiGateway {
  extractProduct(input: RawProductInput): Promise<ProductPassportDraft>;
  parseQuery(query: string): Promise<QueryIntent>;
  verifyEvidence(input: {
    featureKey: string;
    value: ProductPassport["features"][number]["value"];
    evidenceText: string;
  }): Promise<EvidenceVerdict>;
}

export class OpenAIAiGateway implements AiGateway {
  async extractProduct(input: RawProductInput): Promise<ProductPassportDraft> {
    const response = await openai.responses.parse({
      model: env.OPENAI_EXTRACTION_MODEL,
      input: [
        {
          role: "system",
          content:
            "Extract only facts supported by the listing. Use ai_inferred status. Use null and missing status when a value is absent. Do not infer product suitability from generic marketing claims.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: zodTextFormat(
          ProductPassportDraftSchema,
          "product_passport",
        ),
      },
    });
    if (!response.output_parsed) {
      throw new Error("AI_PRODUCT_EXTRACTION_EMPTY");
    }
    return response.output_parsed;
  }

  async parseQuery(query: string): Promise<QueryIntent> {
    const response = await openai.responses.parse({
      model: env.OPENAI_QUERY_MODEL,
      input: [
        {
          role: "system",
          content:
            "Convert the shopping request into normalized intent. Put non-negotiable requirements in hardConstraints and softer wishes in preferences.",
        },
        { role: "user", content: query },
      ],
      text: {
        format: zodTextFormat(QueryIntentSchema, "shopping_intent"),
      },
    });
    if (!response.output_parsed) {
      throw new Error("AI_QUERY_PARSE_EMPTY");
    }
    return response.output_parsed;
  }

  async verifyEvidence(input: {
    featureKey: string;
    value: ProductPassport["features"][number]["value"];
    evidenceText: string;
  }): Promise<EvidenceVerdict> {
    const response = await openai.responses.parse({
      model: env.OPENAI_EXTRACTION_MODEL,
      input: [
        {
          role: "system",
          content:
            "Decide whether the supplied evidence explicitly supports the claimed feature value. Do not accept merely related language.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      text: {
        format: zodTextFormat(
          EvidenceVerdictSchema,
          "evidence_verdict",
        ),
      },
    });
    if (!response.output_parsed) {
      throw new Error("AI_EVIDENCE_VERIFICATION_EMPTY");
    }
    return response.output_parsed;
  }
}
~~~

- [ ] **Step 4: Implement embeddings**

Create web/src/services/embeddings.ts:

~~~typescript
import { env } from "@/lib/env";
import { openai } from "@/lib/openai";

export interface EmbeddingService {
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingService implements EmbeddingService {
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const response = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: texts,
      encoding_format: "float",
    });
    return [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  }
}
~~~

- [ ] **Step 5: Implement extraction orchestration**

Create web/src/features/extraction/extract-passport.ts:

~~~typescript
import {
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";
import type { AiGateway } from "@/services/ai-gateway";
import type { EmbeddingService } from "@/services/embeddings";
import type {
  ProductRecord,
  ProductRepository,
} from "@/services/repositories/contracts";

export function passportToSearchText(passport: ProductPassport): string {
  return [
    passport.name,
    passport.category,
    passport.description,
    ...passport.features.flatMap((feature) => [
      feature.key,
      feature.label,
      String(feature.value ?? ""),
      feature.unit ?? "",
    ]),
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.limitations,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function extractProductPassport(
  product: ProductRecord,
  dependencies: {
    ai: AiGateway;
    embeddings: EmbeddingService;
    products: ProductRepository;
  },
  now: Date = new Date(),
): Promise<ProductPassport> {
  const draft = await dependencies.ai.extractProduct(product);
  const passport = ProductPassportSchema.parse({
    ...draft,
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price ?? draft.price,
    currency: product.currency ?? draft.currency,
    updatedAt: now.toISOString(),
  });
  const [embedding] = await dependencies.embeddings.embed([
    passportToSearchText(passport),
  ]);
  if (!embedding || embedding.length !== 1536) {
    throw new Error("PRODUCT_EMBEDDING_INVALID_LENGTH");
  }
  await dependencies.products.savePassport(product.id, passport);
  await dependencies.products.saveEmbedding(product.id, embedding);
  return passport;
}
~~~

- [ ] **Step 6: Complete in-memory embedding behavior and verify**

Add saveEmbedding and searchByEmbedding to InMemoryProductRepository. saveEmbedding must require exactly 1536 values. searchByEmbedding may return category products with similarity 0.5 because semantic distance itself is tested against Supabase, while domain ranking is tested separately.

Run:

~~~powershell
npm test -- src/features/extraction src/services/repositories
npm run typecheck
npm run lint
~~~

Expected: all checks pass without making a live OpenAI call.

- [ ] **Step 7: Add an optional live contract check**

Create a script web/src/features/extraction/extraction-contract-check.ts that imports one fixed listing, calls OpenAIAiGateway.extractProduct, validates ProductPassportDraftSchema, prints only the field keys and status values, and exits nonzero on validation failure.

Run only when OPENAI_API_KEY is configured:

~~~powershell
npx tsx src/features/extraction/extraction-contract-check.ts
~~~

Expected: the script prints valid feature keys and provenance statuses without exposing the API key.

- [ ] **Step 8: Commit AI extraction**

Run:

~~~powershell
git add web/src/lib/openai.ts web/src/services/ai-gateway.ts web/src/services/embeddings.ts web/src/features/extraction web/src/services/repositories/in-memory.ts
git commit -m "feat: extract grounded product passports"
~~~

### Task 7: Build the market-intelligence RAG pipeline

**Files:**

- Create: web/src/features/market/import-market-signals.ts
- Create: web/src/features/market/import-market-signals.test.ts
- Create: web/src/features/market/retrieve-market-context.ts
- Create: web/src/features/market/build-category-intelligence.ts
- Create: web/src/features/market/build-category-intelligence.test.ts

**Interfaces:**

- Consumes: MarketSignal[], base FeatureDefinition[], EmbeddingService, and MarketRepository
- Produces: importMarketSignals(signals, dependencies), retrieveMarketContext(product, dependencies), and buildCategoryIntelligence(category, baseFeatures, signals)

- [ ] **Step 1: Write failing category-intelligence tests**

Create web/src/features/market/build-category-intelligence.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { makeCategoryIntelligence } from "@/test/fixtures";
import type { MarketSignal } from "@/domain/market";
import { buildCategoryIntelligence } from "./build-category-intelligence";

const signals: MarketSignal[] = [
  {
    id: "query-1",
    category: "running_shoes",
    signalType: "user_query",
    rawText: "Lightweight shoes for humid weather",
    parsedIntent: {
      category: "running_shoes",
      goal: "half_marathon",
      hardConstraints: {},
      preferences: ["lightweight"],
      contexts: ["humid_weather"],
    },
    featureKeys: ["weight", "breathability"],
    featureValues: {},
    frequency: 20,
    sourceLabel: "aggregated_demo_queries",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  },
  {
    id: "competitor-1",
    category: "running_shoes",
    signalType: "competitor_observation",
    rawText: "Competitor shoe weighs 245 g",
    parsedIntent: null,
    featureKeys: ["weight"],
    featureValues: { weight: 245 },
    frequency: 1,
    sourceLabel: "permitted_competitor_dataset",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  },
];

describe("buildCategoryIntelligence", () => {
  it("derives demand, coverage, medians, and benchmark intents", () => {
    const base = makeCategoryIntelligence();
    const result = buildCategoryIntelligence(
      "running_shoes",
      base.features,
      signals,
    );

    expect(result.features.find((item) => item.key === "weight")?.demandWeight)
      .toBe(1);
    expect(result.peerMedians.weight).toBe(245);
    expect(result.intents).toHaveLength(1);
  });
});
~~~

- [ ] **Step 2: Implement category aggregation**

Create web/src/features/market/build-category-intelligence.ts:

~~~typescript
import type {
  CategoryIntelligence,
  FeatureDefinition,
  MarketSignal,
} from "@/domain/market";

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function buildCategoryIntelligence(
  category: string,
  baseFeatures: FeatureDefinition[],
  signals: MarketSignal[],
): CategoryIntelligence {
  const categorySignals = signals.filter(
    (signal) => signal.category === category,
  );
  const querySignals = categorySignals.filter(
    (signal) => signal.signalType === "user_query",
  );
  const competitorSignals = categorySignals.filter(
    (signal) => signal.signalType === "competitor_observation",
  );
  const demandTotals = new Map<string, number>();
  for (const signal of querySignals) {
    for (const key of signal.featureKeys) {
      demandTotals.set(
        key,
        (demandTotals.get(key) ?? 0) + signal.frequency,
      );
    }
  }
  const maxDemand = Math.max(1, ...demandTotals.values());
  const features = baseFeatures.map((feature) => ({
    ...feature,
    demandWeight: (demandTotals.get(feature.key) ?? 0) / maxDemand,
    competitiveCoverage:
      competitorSignals.length === 0
        ? feature.competitiveCoverage
        : competitorSignals.filter((signal) =>
            signal.featureKeys.includes(feature.key),
          ).length / competitorSignals.length,
  }));
  const peerMedians = Object.fromEntries(
    baseFeatures.flatMap((feature) => {
      const value = median(
        competitorSignals.flatMap((signal) => {
          const observed = signal.featureValues[feature.key];
          return typeof observed === "number" ? [observed] : [];
        }),
      );
      return value === null ? [] : [[feature.key, value]];
    }),
  );
  const priceValues = competitorSignals.flatMap((signal) => {
    const value = signal.featureValues.price;
    return typeof value === "number" ? [value] : [];
  });
  const highConstraintKeys = new Set(
    features
      .filter((feature) => feature.constraintImportance >= 0.8)
      .map((feature) => feature.key),
  );
  const intents = querySignals.flatMap((signal) =>
    signal.parsedIntent
      ? [
          {
            id: signal.id,
            label: signal.rawText,
            weight: Math.max(1, signal.frequency),
            requiredFeatures: signal.featureKeys.filter((key) =>
              highConstraintKeys.has(key),
            ),
            preferredFeatures: signal.featureKeys.filter(
              (key) => !highConstraintKeys.has(key),
            ),
          },
        ]
      : [],
  );

  return {
    category,
    features,
    intents,
    peerMedians,
    peerPriceMedian: median(priceValues),
  };
}
~~~

- [ ] **Step 3: Implement signal import**

Create web/src/features/market/import-market-signals.ts:

~~~typescript
import { MarketSignalSchema, type MarketSignal } from "@/domain/market";
import type { EmbeddingService } from "@/services/embeddings";
import type { MarketRepository } from "@/services/repositories/contracts";

export async function importMarketSignals(
  rawSignals: unknown[],
  dependencies: {
    embeddings: EmbeddingService;
    market: MarketRepository;
  },
): Promise<MarketSignal[]> {
  const signals = rawSignals.map((signal) => MarketSignalSchema.parse(signal));
  const embeddings = await dependencies.embeddings.embed(
    signals.map((signal) =>
      [
        signal.rawText,
        ...signal.featureKeys,
        ...Object.entries(signal.featureValues).map(
          ([key, value]) => key + " " + String(value),
        ),
      ].join(" "),
    ),
  );
  if (
    embeddings.length !== signals.length ||
    embeddings.some((embedding) => embedding.length !== 1536)
  ) {
    throw new Error("MARKET_SIGNAL_EMBEDDING_MISMATCH");
  }
  await dependencies.market.saveSignals(signals, embeddings);
  return signals;
}
~~~

Write web/src/features/market/import-market-signals.test.ts with a two-signal input, a fake embedding service returning two 1536-dimensional vectors, and an in-memory MarketRepository. Assert saveSignals receives aligned signal and embedding arrays.

- [ ] **Step 4: Implement category-filtered RAG retrieval**

Create web/src/features/market/retrieve-market-context.ts:

~~~typescript
import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { EmbeddingService } from "@/services/embeddings";
import type { MarketRepository } from "@/services/repositories/contracts";

export async function retrieveMarketContext(
  passport: ProductPassport,
  dependencies: {
    embeddings: EmbeddingService;
    market: MarketRepository;
  },
  limit = 40,
): Promise<MarketSignal[]> {
  const query = [
    passport.name,
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.features.map(
      (feature) => feature.key + " " + String(feature.value ?? ""),
    ),
  ].join(" ");
  const [embedding] = await dependencies.embeddings.embed([query]);
  if (!embedding || embedding.length !== 1536) {
    throw new Error("MARKET_QUERY_EMBEDDING_INVALID");
  }
  const signals = await dependencies.market.retrieve(
    passport.category,
    query,
    embedding,
    limit,
  );
  if (signals.some((signal) => signal.category !== passport.category)) {
    throw new Error("MARKET_RETRIEVAL_CATEGORY_LEAK");
  }
  return signals;
}
~~~

- [ ] **Step 5: Verify and commit market intelligence**

Run:

~~~powershell
npm test -- src/features/market
npm run typecheck
npm run lint
git add web/src/features/market
git commit -m "feat: retrieve demand and competitor intelligence"
~~~

### Task 8: Implement evidence-aware seller interviews

**Files:**

- Create: web/supabase/migrations/202608290002_evidence.sql
- Create: web/src/features/interviews/answer-application.ts
- Create: web/src/features/interviews/answer-application.test.ts
- Create: web/src/features/interviews/interview-service.ts
- Create: web/src/features/interviews/interview-service.test.ts
- Modify: web/src/services/repositories/contracts.ts
- Modify: web/src/services/repositories/in-memory.ts
- Create: web/src/services/repositories/supabase-evidence-repository.ts

**Interfaces:**

- Consumes: ProductRepository, SessionRepository, EvidenceRepository, AiGateway, CategoryIntelligence, and ListingEvaluation
- Produces: SellerAnswer, applySellerAnswer(passport, answer, verification, now), startInterview(productId, dependencies), and answerInterview(sessionId, answer, dependencies)

- [ ] **Step 1: Add evidence persistence**

Create web/supabase/migrations/202608290002_evidence.sql:

~~~sql
create table evidence_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  feature_key text not null,
  original_name text,
  media_type text not null,
  storage_path text,
  extracted_text text not null,
  supported boolean not null,
  supporting_excerpt text,
  created_at timestamptz not null default now()
);

alter table evidence_records enable row level security;
create index evidence_records_product_idx on evidence_records(product_id);
~~~

Add these contracts to web/src/services/repositories/contracts.ts:

~~~typescript
export type EvidenceRecord = {
  id: string;
  productId: string;
  featureKey: string;
  originalName: string | null;
  mediaType: string;
  storagePath: string | null;
  extractedText: string;
  supported: boolean;
  supportingExcerpt: string | null;
  createdAt: string;
};

export interface EvidenceRepository {
  create(
    input: Omit<EvidenceRecord, "id" | "createdAt">,
  ): Promise<EvidenceRecord>;
  listForProduct(productId: string): Promise<EvidenceRecord[]>;
}
~~~

Implement in-memory and Supabase versions with the same cloning and row-mapping rules as Task 4.

- [ ] **Step 2: Write failing answer-application tests**

Create web/src/features/interviews/answer-application.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import { applySellerAnswer } from "./answer-application";

describe("applySellerAnswer", () => {
  it("marks supported evidence as verified", () => {
    const updated = applySellerAnswer(
      makePassport(),
      {
        featureKey: "weight",
        label: "Measured weight",
        value: 220,
        unit: "g",
        unknown: false,
        evidenceId: "evidence-weight",
      },
      { supported: true },
      new Date("2026-08-29T01:00:00.000Z"),
    );

    expect(updated.features[0]).toMatchObject({
      key: "weight",
      value: 220,
      status: "verified",
      evidenceIds: ["evidence-weight"],
    });
  });

  it("does not fabricate a value when the seller selects unknown", () => {
    const original = makePassport();
    const updated = applySellerAnswer(
      original,
      {
        featureKey: "weight",
        label: "Measured weight",
        value: null,
        unit: "g",
        unknown: true,
        evidenceId: null,
      },
      { supported: false },
      new Date("2026-08-29T01:00:00.000Z"),
    );

    expect(updated.features).toEqual([]);
  });
});
~~~

- [ ] **Step 3: Implement seller-answer application**

Create web/src/features/interviews/answer-application.ts:

~~~typescript
import { z } from "zod";
import {
  FeatureScalarSchema,
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";

export const SellerAnswerSchema = z.object({
  featureKey: z.string().min(1),
  label: z.string().min(1),
  value: FeatureScalarSchema.nullable(),
  unit: z.string().nullable(),
  unknown: z.boolean(),
  evidenceId: z.string().nullable(),
});

export type SellerAnswer = z.infer<typeof SellerAnswerSchema>;

export function applySellerAnswer(
  passport: ProductPassport,
  answer: SellerAnswer,
  verification: { supported: boolean },
  now: Date = new Date(),
): ProductPassport {
  const parsed = SellerAnswerSchema.parse(answer);
  if (parsed.unknown) {
    return ProductPassportSchema.parse({
      ...passport,
      updatedAt: now.toISOString(),
    });
  }
  if (parsed.value === null) {
    throw new Error("SELLER_ANSWER_VALUE_REQUIRED");
  }
  const status = verification.supported ? "verified" : "seller_declared";
  const feature = {
    key: parsed.featureKey,
    label: parsed.label,
    value: parsed.value,
    unit: parsed.unit,
    status,
    confidence: verification.supported ? 0.95 : 0.7,
    evidenceIds: parsed.evidenceId ? [parsed.evidenceId] : [],
  } as const;
  const features = passport.features.filter(
    (item) => item.key !== parsed.featureKey,
  );
  features.push(feature);
  return ProductPassportSchema.parse({
    ...passport,
    features,
    updatedAt: now.toISOString(),
  });
}
~~~

- [ ] **Step 4: Write and implement interview-service behavior**

Create web/src/features/interviews/interview-service.test.ts with these cases:

1. startInterview creates a session and asks the highest-priority gap.
2. answerInterview verifies supplied evidence text, stores the evidence record, applies the answer, recalculates evaluation, marks the feature as asked, and returns the next gap.
3. an Unknown answer marks the feature as asked without creating evidence or changing the Product Passport.

Create web/src/features/interviews/interview-service.ts with:

~~~typescript
import type { CategoryIntelligence } from "@/domain/market";
import type { AiGateway } from "@/services/ai-gateway";
import type {
  EvidenceRepository,
  ProductRepository,
  SessionRepository,
} from "@/services/repositories/contracts";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { selectNextGap } from "./question-priority";
import {
  applySellerAnswer,
  SellerAnswerSchema,
  type SellerAnswer,
} from "./answer-application";

type InterviewDependencies = {
  products: ProductRepository;
  sessions: SessionRepository;
  evidence: EvidenceRepository;
  ai: AiGateway;
  intelligence: CategoryIntelligence;
};

export async function startInterview(
  productId: string,
  dependencies: InterviewDependencies,
) {
  const product = await dependencies.products.get(productId);
  if (!product?.passport || !product.evaluation) {
    throw new Error("INTERVIEW_PRODUCT_NOT_READY");
  }
  const session = await dependencies.sessions.create(productId);
  const nextGap = selectNextGap(product.evaluation.gaps, []);
  if (nextGap) {
    await dependencies.sessions.appendMessage(session.id, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: nextGap.question,
      featureKey: nextGap.featureKey,
      createdAt: new Date().toISOString(),
    });
  }
  return { session, nextGap };
}

export async function answerInterview(
  sessionId: string,
  answerInput: SellerAnswer & { evidenceText: string | null },
  dependencies: InterviewDependencies,
  now: Date = new Date(),
) {
  const answer = SellerAnswerSchema.parse(answerInput);
  const session = await dependencies.sessions.get(sessionId);
  if (!session) {
    throw new Error("INTERVIEW_SESSION_NOT_FOUND");
  }
  const product = await dependencies.products.get(session.productId);
  if (!product?.passport) {
    throw new Error("INTERVIEW_PRODUCT_PASSPORT_MISSING");
  }
  let supported = false;
  let evidenceId: string | null = null;
  if (!answer.unknown && answerInput.evidenceText?.trim()) {
    const verdict = await dependencies.ai.verifyEvidence({
      featureKey: answer.featureKey,
      value: answer.value,
      evidenceText: answerInput.evidenceText,
    });
    const record = await dependencies.evidence.create({
      productId: product.id,
      featureKey: answer.featureKey,
      originalName: null,
      mediaType: "text/plain",
      storagePath: null,
      extractedText: answerInput.evidenceText,
      supported: verdict.supported,
      supportingExcerpt: verdict.supportingExcerpt,
    });
    supported = verdict.supported;
    evidenceId = record.id;
  }
  const passport = applySellerAnswer(
    product.passport,
    { ...answer, evidenceId },
    { supported },
    now,
  );
  const evaluation = evaluateListing(
    passport,
    dependencies.intelligence,
    now,
  );
  await dependencies.products.savePassport(product.id, passport);
  await dependencies.products.saveEvaluation(product.id, evaluation);
  await dependencies.sessions.markAsked(session.id, answer.featureKey);
  await dependencies.sessions.appendMessage(session.id, {
    id: crypto.randomUUID(),
    role: "seller",
    content: answer.unknown ? "Unknown" : String(answer.value),
    featureKey: answer.featureKey,
    createdAt: now.toISOString(),
  });
  const nextGap = selectNextGap(evaluation.gaps, [
    ...session.askedFeatureKeys,
    answer.featureKey,
  ]);
  return { passport, evaluation, nextGap };
}
~~~

- [ ] **Step 5: Apply migration, verify, and commit interviews**

Run:

~~~powershell
npx supabase db reset
npm test -- src/features/interviews src/services/repositories
npm run typecheck
npm run lint
git add web/supabase web/src/features/interviews web/src/services/repositories
git commit -m "feat: conduct evidence-aware seller interviews"
~~~

Expected: migration and all interview tests pass.

### Task 9: Implement buyer-query parsing and recommendation simulation

**Files:**

- Create: web/src/features/recommendation/parse-query.ts
- Create: web/src/features/recommendation/rank-products.ts
- Create: web/src/features/recommendation/rank-products.test.ts
- Create: web/src/features/recommendation/simulate-recommendation.ts
- Create: web/src/features/recommendation/simulate-recommendation.test.ts

**Interfaces:**

- Consumes: AiGateway, EmbeddingService, ProductRepository, buyer query, original Product Passport, and current Product Passport
- Produces: parseBuyerQuery(query, ai), rankProducts(query, intent, candidates), and simulateRecommendation(productId, query, dependencies)

- [ ] **Step 1: Write failing hard-constraint and ranking tests**

Create web/src/features/recommendation/rank-products.test.ts:

~~~typescript
import { describe, expect, it } from "vitest";
import { makePassport } from "@/test/fixtures";
import { rankProducts } from "./rank-products";

describe("rankProducts", () => {
  it("rejects an over-budget product regardless of similarity", () => {
    const result = rankProducts(
      "Road shoes under S$200",
      {
        category: "running_shoes",
        goal: "road_running",
        hardConstraints: { price_max: 200 },
        preferences: ["lightweight"],
        contexts: [],
      },
      [
        {
          passport: makePassport({ price: 250 }),
          similarity: 0.99,
        },
        {
          passport: makePassport({
            productId: "within-budget",
            price: 179,
          }),
          similarity: 0.7,
        },
      ],
    );

    expect(
      result.candidates.find(
        (candidate) => candidate.productId === "product-cloudrun",
      ),
    ).toMatchObject({
      eligible: false,
      rank: null,
      failedConstraints: ["price_max"],
    });
    expect(
      result.candidates.find(
        (candidate) => candidate.productId === "within-budget",
      )?.rank,
    ).toBe(1);
  });

  it("marks unknown hard features as missing evidence", () => {
    const result = rankProducts(
      "Stable road shoes",
      {
        category: "running_shoes",
        goal: null,
        hardConstraints: { stability: "high" },
        preferences: [],
        contexts: [],
      },
      [{ passport: makePassport(), similarity: 0.9 }],
    );

    expect(result.candidates[0]).toMatchObject({
      eligible: false,
      missingEvidence: ["stability"],
    });
  });
});
~~~

- [ ] **Step 2: Implement deterministic ranking**

Create web/src/features/recommendation/rank-products.ts:

~~~typescript
import type { QueryIntent } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { RecommendationResult } from "@/domain/recommendation";

type CandidateInput = {
  passport: ProductPassport;
  similarity: number;
};

function featureText(passport: ProductPassport): string {
  return [
    passport.description,
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.features.flatMap((feature) => [
      feature.key,
      feature.label,
      String(feature.value ?? ""),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

export function rankProducts(
  query: string,
  intent: QueryIntent,
  inputs: CandidateInput[],
): RecommendationResult {
  const candidates = inputs.map(({ passport, similarity }) => {
    const features = new Map(
      passport.features.map((feature) => [feature.key, feature]),
    );
    const failedConstraints: string[] = [];
    const missingEvidence: string[] = [];
    for (const [key, expected] of Object.entries(intent.hardConstraints)) {
      if (key === "price_max") {
        if (passport.price === null) {
          missingEvidence.push(key);
        } else if (passport.price > Number(expected)) {
          failedConstraints.push(key);
        }
        continue;
      }
      if (key === "price_min") {
        if (passport.price === null) {
          missingEvidence.push(key);
        } else if (passport.price < Number(expected)) {
          failedConstraints.push(key);
        }
        continue;
      }
      const feature = features.get(key);
      if (!feature || feature.value === null || feature.status === "missing") {
        missingEvidence.push(key);
      } else if (
        String(feature.value).toLowerCase() !== String(expected).toLowerCase()
      ) {
        failedConstraints.push(key);
      }
    }
    const text = featureText(passport);
    const requestedTerms = [...intent.preferences, ...intent.contexts];
    const matchedTerms = requestedTerms.filter((term) =>
      text.includes(term.toLowerCase().replaceAll("_", " ")),
    );
    const preferenceCoverage =
      requestedTerms.length === 0
        ? 1
        : matchedTerms.length / requestedTerms.length;
    const presentFeatures = passport.features.filter(
      (feature) => feature.value !== null && feature.status !== "missing",
    );
    const evidenceQuality =
      presentFeatures.length === 0
        ? 0
        : presentFeatures.reduce((sum, feature) => {
            if (feature.status === "verified") return sum + 1;
            if (feature.status === "seller_declared") return sum + 0.6;
            if (feature.status === "ai_inferred") return sum + 0.25;
            return sum;
          }, 0) / presentFeatures.length;
    const fitScore = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          100 *
            (0.55 * Math.max(0, Math.min(1, similarity)) +
              0.3 * preferenceCoverage +
              0.15 * evidenceQuality),
        ),
      ),
    );
    return {
      productId: passport.productId,
      eligible:
        failedConstraints.length === 0 && missingEvidence.length === 0,
      rank: null,
      fitScore,
      matchedFacts: matchedTerms,
      failedConstraints,
      missingEvidence,
    };
  });
  const eligible = candidates
    .filter((candidate) => candidate.eligible)
    .sort(
      (left, right) =>
        right.fitScore - left.fitScore ||
        left.productId.localeCompare(right.productId),
    );
  eligible.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });
  return {
    query,
    intent,
    candidates,
    scoringVersion: "1.0.0",
  };
}
~~~

- [ ] **Step 3: Implement structured buyer-query parsing**

Create web/src/features/recommendation/parse-query.ts:

~~~typescript
import type { QueryIntent } from "@/domain/market";
import type { AiGateway } from "@/services/ai-gateway";

export async function parseBuyerQuery(
  query: string,
  ai: AiGateway,
): Promise<QueryIntent> {
  const trimmed = query.trim();
  if (trimmed.length < 5) {
    throw new Error("BUYER_QUERY_TOO_SHORT");
  }
  return ai.parseQuery(trimmed);
}
~~~

- [ ] **Step 4: Implement before-and-after simulation**

Create web/src/features/recommendation/simulate-recommendation.ts:

~~~typescript
import type { EmbeddingService } from "@/services/embeddings";
import type { AiGateway } from "@/services/ai-gateway";
import type { ProductRepository } from "@/services/repositories/contracts";
import { parseBuyerQuery } from "./parse-query";
import { rankProducts } from "./rank-products";

export async function simulateRecommendation(
  productId: string,
  query: string,
  dependencies: {
    ai: AiGateway;
    embeddings: EmbeddingService;
    products: ProductRepository;
  },
) {
  const target = await dependencies.products.get(productId);
  if (!target?.passport || !target.originalPassport) {
    throw new Error("SIMULATION_PRODUCT_NOT_READY");
  }
  const intent = await parseBuyerQuery(query, dependencies.ai);
  const [embedding] = await dependencies.embeddings.embed([query]);
  if (!embedding || embedding.length !== 1536) {
    throw new Error("SIMULATION_EMBEDDING_INVALID");
  }
  const semanticCandidates = await dependencies.products.searchByEmbedding(
    intent.category,
    embedding,
    20,
  );
  const candidates = semanticCandidates.map((candidate) => ({
    passport: candidate.passport,
    similarity: candidate.similarity,
  })).filter(
    (candidate): candidate is {
      passport: NonNullable<typeof candidate.passport>;
      similarity: number;
    } => candidate.passport !== null,
  );
  const targetSimilarity =
    semanticCandidates.find((candidate) => candidate.id === productId)
      ?.similarity ?? 0.5;
  const competitors = candidates.filter(
    (candidate) => candidate.passport.productId !== productId,
  );
  const before = rankProducts(query, intent, [
    ...competitors,
    { passport: target.originalPassport, similarity: targetSimilarity },
  ]);
  const after = rankProducts(query, intent, [
    ...competitors,
    { passport: target.passport, similarity: targetSimilarity },
  ]);
  return { intent, before, after };
}
~~~

Write web/src/features/recommendation/simulate-recommendation.test.ts using fake AiGateway, fake EmbeddingService, and InMemoryProductRepository. Save an original passport without weight, save an updated passport with verified weight, then assert the target changes from missingEvidence to eligible for a weight hard constraint.

- [ ] **Step 5: Verify and commit recommendation simulation**

Run:

~~~powershell
npm test -- src/features/recommendation
npm run typecheck
npm run lint
git add web/src/features/recommendation
git commit -m "feat: simulate before and after recommendations"
~~~

### Task 10: Expose the application API and orchestration layer

**Files:**

- Create: web/src/lib/api-response.ts
- Create: web/src/services/container.ts
- Create: web/src/services/application-service.ts
- Create: web/src/services/application-service.test.ts
- Create: web/src/data/running-shoes-category.json
- Create: web/src/app/api/products/route.ts
- Create: web/src/app/api/products/[productId]/route.ts
- Create: web/src/app/api/products/[productId]/extract/route.ts
- Create: web/src/app/api/products/[productId]/evaluate/route.ts
- Create: web/src/app/api/products/[productId]/export/route.ts
- Create: web/src/app/api/products/[productId]/interviews/route.ts
- Create: web/src/app/api/interviews/[sessionId]/answers/route.ts
- Create: web/src/app/api/products/[productId]/simulate/route.ts
- Create: web/src/app/api/market-signals/import/route.ts
- Create: web/src/app/api/products/route.test.ts

**Interfaces:**

- Consumes: all feature services and repositories
- Produces: typed JSON endpoints using a shared success and error envelope

- [ ] **Step 1: Create the base running-shoe ontology**

Create web/src/data/running-shoes-category.json. Every entry must include key, label, dataType, unit, required, demandWeight, constraintImportance, competitiveCoverage, competitiveDirection, answerability, evidenceRequired, and synonyms.

Use these exact feature definitions:

~~~json
[
  {
    "key": "sizes",
    "label": "Available sizes",
    "dataType": "string_array",
    "unit": null,
    "required": true,
    "demandWeight": 0.9,
    "constraintImportance": 1,
    "competitiveCoverage": 0.95,
    "competitiveDirection": "neutral",
    "answerability": 1,
    "evidenceRequired": false,
    "synonyms": ["size", "sizing", "fit"]
  },
  {
    "key": "weight",
    "label": "Measured weight",
    "dataType": "number",
    "unit": "g",
    "required": true,
    "demandWeight": 0.9,
    "constraintImportance": 0.8,
    "competitiveCoverage": 0.75,
    "competitiveDirection": "lower",
    "answerability": 1,
    "evidenceRequired": true,
    "synonyms": ["lightweight", "grams", "shoe weight"]
  },
  {
    "key": "reference_size",
    "label": "Weight reference size",
    "dataType": "string",
    "unit": null,
    "required": true,
    "demandWeight": 0.65,
    "constraintImportance": 0.7,
    "competitiveCoverage": 0.65,
    "competitiveDirection": "neutral",
    "answerability": 1,
    "evidenceRequired": true,
    "synonyms": ["reference shoe size", "sample size"]
  },
  {
    "key": "terrain",
    "label": "Running terrain",
    "dataType": "string_array",
    "unit": null,
    "required": true,
    "demandWeight": 0.85,
    "constraintImportance": 1,
    "competitiveCoverage": 0.9,
    "competitiveDirection": "neutral",
    "answerability": 1,
    "evidenceRequired": false,
    "synonyms": ["road", "trail", "track", "mixed terrain"]
  },
  {
    "key": "cushioning",
    "label": "Cushioning level",
    "dataType": "string",
    "unit": null,
    "required": false,
    "demandWeight": 0.75,
    "constraintImportance": 0.6,
    "competitiveCoverage": 0.8,
    "competitiveDirection": "neutral",
    "answerability": 0.9,
    "evidenceRequired": false,
    "synonyms": ["soft", "firm", "plush", "responsive"]
  },
  {
    "key": "stability",
    "label": "Stability type",
    "dataType": "string",
    "unit": null,
    "required": false,
    "demandWeight": 0.8,
    "constraintImportance": 0.9,
    "competitiveCoverage": 0.7,
    "competitiveDirection": "neutral",
    "answerability": 0.9,
    "evidenceRequired": true,
    "synonyms": ["neutral", "stability", "motion control", "pronation"]
  },
  {
    "key": "upper_material",
    "label": "Upper material",
    "dataType": "string",
    "unit": null,
    "required": false,
    "demandWeight": 0.7,
    "constraintImportance": 0.5,
    "competitiveCoverage": 0.8,
    "competitiveDirection": "neutral",
    "answerability": 0.9,
    "evidenceRequired": true,
    "synonyms": ["mesh", "knit", "synthetic upper"]
  },
  {
    "key": "breathability",
    "label": "Breathability",
    "dataType": "string",
    "unit": null,
    "required": false,
    "demandWeight": 0.8,
    "constraintImportance": 0.7,
    "competitiveCoverage": 0.6,
    "competitiveDirection": "higher",
    "answerability": 0.8,
    "evidenceRequired": true,
    "synonyms": ["ventilated", "airflow", "breathable"]
  },
  {
    "key": "weather_suitability",
    "label": "Weather suitability",
    "dataType": "string_array",
    "unit": null,
    "required": false,
    "demandWeight": 0.75,
    "constraintImportance": 0.7,
    "competitiveCoverage": 0.45,
    "competitiveDirection": "neutral",
    "answerability": 0.7,
    "evidenceRequired": true,
    "synonyms": ["humid weather", "hot weather", "rain", "cold weather"]
  },
  {
    "key": "distance_suitability",
    "label": "Distance suitability",
    "dataType": "string_array",
    "unit": null,
    "required": false,
    "demandWeight": 0.8,
    "constraintImportance": 0.75,
    "competitiveCoverage": 0.55,
    "competitiveDirection": "neutral",
    "answerability": 0.8,
    "evidenceRequired": true,
    "synonyms": ["5k", "10k", "half marathon", "marathon", "long distance"]
  },
  {
    "key": "sustainability_claims",
    "label": "Sustainability claims",
    "dataType": "string_array",
    "unit": null,
    "required": false,
    "demandWeight": 0.55,
    "constraintImportance": 0.5,
    "competitiveCoverage": 0.4,
    "competitiveDirection": "neutral",
    "answerability": 0.6,
    "evidenceRequired": true,
    "synonyms": ["recycled", "certified", "low impact", "sustainable"]
  },
  {
    "key": "return_policy",
    "label": "Return policy",
    "dataType": "string",
    "unit": null,
    "required": false,
    "demandWeight": 0.45,
    "constraintImportance": 0.4,
    "competitiveCoverage": 0.85,
    "competitiveDirection": "neutral",
    "answerability": 1,
    "evidenceRequired": false,
    "synonyms": ["returns", "trial period", "exchange"]
  }
]
~~~

- [ ] **Step 2: Add shared API responses**

Create web/src/lib/api-response.ts:

~~~typescript
import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
};

export function apiSuccess<T>(
  data: T,
  status = 200,
  requestId = crypto.randomUUID(),
) {
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, requestId },
    { status },
  );
}

export function apiFailure(
  code: string,
  message: string,
  status: number,
  requestId = crypto.randomUUID(),
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message }, requestId },
    { status },
  );
}

export async function withApiErrors(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNEXPECTED_SERVER_ERROR";
    const notFound = message.endsWith("_NOT_FOUND");
    const invalid =
      message.includes("INVALID") ||
      message.includes("REQUIRED") ||
      message.includes("TOO_SHORT");
    return apiFailure(
      message,
      invalid ? "The request is invalid." : notFound ? "The record was not found." : "The operation failed.",
      invalid ? 400 : notFound ? 404 : 500,
    );
  }
}
~~~

- [ ] **Step 3: Create the dependency container**

Create web/src/services/container.ts. Instantiate one OpenAIAiGateway, one OpenAIEmbeddingService, and Supabase repository instances. Export getApplicationDependencies() so route tests can mock one module boundary.

~~~typescript
import "server-only";
import { OpenAIAiGateway } from "./ai-gateway";
import { OpenAIEmbeddingService } from "./embeddings";
import { SupabaseEvidenceRepository } from "./repositories/supabase-evidence-repository";
import { SupabaseMarketRepository } from "./repositories/supabase-market-repository";
import { SupabaseProductRepository } from "./repositories/supabase-product-repository";
import { SupabaseSessionRepository } from "./repositories/supabase-session-repository";

export function getApplicationDependencies() {
  return {
    ai: new OpenAIAiGateway(),
    embeddings: new OpenAIEmbeddingService(),
    products: new SupabaseProductRepository(),
    market: new SupabaseMarketRepository(),
    sessions: new SupabaseSessionRepository(),
    evidence: new SupabaseEvidenceRepository(),
  };
}
~~~

- [ ] **Step 4: Write a failing application-service test**

Create web/src/services/application-service.test.ts. Use in-memory repositories, fake AiGateway, and fake EmbeddingService. Import one weak listing, call analyzeProduct, and assert:

~~~typescript
expect(result.passport.productId).toBe(product.id);
expect(result.evaluation.gaps[0].featureKey).toBe("weight");
expect(result.intelligence.category).toBe("running_shoes");
~~~

The fake MarketRepository must return the query and competitor observations from Task 7.

- [ ] **Step 5: Implement application orchestration**

Create web/src/services/application-service.ts:

~~~typescript
import rawRunningShoeFeatures from "@/data/running-shoes-category.json";
import {
  FeatureDefinitionSchema,
  type CategoryIntelligence,
} from "@/domain/market";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { extractProductPassport } from "@/features/extraction/extract-passport";
import { buildCategoryIntelligence } from "@/features/market/build-category-intelligence";
import { retrieveMarketContext } from "@/features/market/retrieve-market-context";
import type { AiGateway } from "./ai-gateway";
import type { EmbeddingService } from "./embeddings";
import type {
  MarketRepository,
  ProductRepository,
} from "./repositories/contracts";

type AnalysisDependencies = {
  ai: AiGateway;
  embeddings: EmbeddingService;
  products: ProductRepository;
  market: MarketRepository;
};

export async function loadIntelligence(
  productId: string,
  dependencies: AnalysisDependencies,
): Promise<CategoryIntelligence> {
  const product = await dependencies.products.get(productId);
  if (!product?.passport) {
    throw new Error("PRODUCT_PASSPORT_NOT_FOUND");
  }
  const signals = await retrieveMarketContext(product.passport, {
    embeddings: dependencies.embeddings,
    market: dependencies.market,
  });
  const baseFeatures = FeatureDefinitionSchema.array().parse(
    rawRunningShoeFeatures,
  );
  return buildCategoryIntelligence(
    product.passport.category,
    baseFeatures,
    signals,
  );
}

export async function analyzeProduct(
  productId: string,
  dependencies: AnalysisDependencies,
  now: Date = new Date(),
) {
  const product = await dependencies.products.get(productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  const passport = product.passport ?? await extractProductPassport(
    product,
    {
      ai: dependencies.ai,
      embeddings: dependencies.embeddings,
      products: dependencies.products,
    },
    now,
  );
  const intelligence = await loadIntelligence(productId, dependencies);
  const evaluation = evaluateListing(passport, intelligence, now);
  await dependencies.products.saveEvaluation(productId, evaluation);
  return { passport, evaluation, intelligence };
}
~~~

- [ ] **Step 6: Implement the product import route with a contract test**

Create web/src/app/api/products/route.test.ts:

~~~typescript
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/services/container", () => ({
  getApplicationDependencies: () => ({
    products: {
      create: vi.fn(async (input) => ({
        ...input,
        id: "product-1",
        passport: null,
        originalPassport: null,
        evaluation: null,
        embedding: null,
        createdAt: "2026-08-29T00:00:00.000Z",
        updatedAt: "2026-08-29T00:00:00.000Z",
      })),
    },
  }),
}));

describe("POST /api/products", () => {
  it("imports a pasted listing", async () => {
    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        format: "text",
        content: "CloudRun Pro\nLightweight shoe\nPrice: S$179",
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      data: { productIds: ["product-1"] },
    });
  });
});
~~~

Create web/src/app/api/products/route.ts:

~~~typescript
import { z } from "zod";
import {
  CsvCatalogAdapter,
  JsonCatalogAdapter,
  TextCatalogAdapter,
} from "@/features/catalog/adapters";
import { importProducts } from "@/features/catalog/import-product";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const RequestSchema = z.object({
  format: z.enum(["text", "json", "csv"]),
  content: z.string().min(1),
});

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const body = RequestSchema.parse(await request.json());
    const adapter =
      body.format === "csv"
        ? new CsvCatalogAdapter()
        : body.format === "json"
          ? new JsonCatalogAdapter()
          : new TextCatalogAdapter();
    const { products } = getApplicationDependencies();
    const imported = await importProducts(adapter, body.content, products);
    return apiSuccess(
      { productIds: imported.map((product) => product.id) },
      201,
    );
  });
}
~~~

- [ ] **Step 7: Implement the remaining route contracts**

Create each route with strict Zod input validation and withApiErrors:

| Route | Input | Success data | Status |
|---|---|---|---:|
| GET /api/products/{productId} | path identifier | ProductRecord | 200 |
| POST /api/products/{productId}/extract | empty JSON object | passport, evaluation, intelligence | 200 |
| POST /api/products/{productId}/evaluate | empty JSON object | evaluation, intelligence | 200 |
| GET /api/products/{productId}/export | path identifier | ProductPassport | 200 |
| POST /api/products/{productId}/interviews | empty JSON object | session, nextGap | 201 |
| POST /api/interviews/{sessionId}/answers | SellerAnswer plus evidenceText | passport, evaluation, nextGap | 200 |
| POST /api/products/{productId}/simulate | query string with minimum length 5 | intent, before, after | 200 |
| POST /api/market-signals/import | signals array | importedCount | 201 |

The evaluate route must call loadIntelligence, evaluateListing, and saveEvaluation without re-extracting the passport. The interview routes must load current CategoryIntelligence before calling the Task 8 services. The simulate route must call simulateRecommendation. The market import route must call importMarketSignals.

Use these route implementations.

web/src/app/api/products/[productId]/route.ts:

~~~typescript
import { apiFailure, apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    const product = await getApplicationDependencies().products.get(productId);
    return product
      ? apiSuccess(product)
      : apiFailure("PRODUCT_NOT_FOUND", "The product was not found.", 404);
  });
}
~~~

web/src/app/api/products/[productId]/extract/route.ts:

~~~typescript
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { analyzeProduct } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    return apiSuccess(
      await analyzeProduct(productId, getApplicationDependencies()),
    );
  });
}
~~~

web/src/app/api/products/[productId]/evaluate/route.ts:

~~~typescript
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { loadIntelligence } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    const dependencies = getApplicationDependencies();
    const product = await dependencies.products.get(productId);
    if (!product?.passport) throw new Error("PRODUCT_PASSPORT_NOT_FOUND");
    const intelligence = await loadIntelligence(productId, dependencies);
    const evaluation = evaluateListing(product.passport, intelligence);
    await dependencies.products.saveEvaluation(productId, evaluation);
    return apiSuccess({ evaluation, intelligence });
  });
}
~~~

web/src/app/api/products/[productId]/export/route.ts:

~~~typescript
import { apiFailure, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    const product = await getApplicationDependencies().products.get(productId);
    if (!product?.passport) {
      return apiFailure(
        "PRODUCT_PASSPORT_NOT_FOUND",
        "The Product Passport was not found.",
        404,
      );
    }
    return new Response(JSON.stringify(product.passport, null, 2), {
      headers: {
        "content-disposition": 'attachment; filename="product-passport.json"',
        "content-type": "application/json",
      },
    });
  });
}
~~~

web/src/app/api/products/[productId]/interviews/route.ts:

~~~typescript
import { startInterview } from "@/features/interviews/interview-service";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { loadIntelligence } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    const dependencies = getApplicationDependencies();
    const intelligence = await loadIntelligence(productId, dependencies);
    return apiSuccess(
      await startInterview(productId, { ...dependencies, intelligence }),
      201,
    );
  });
}
~~~

web/src/app/api/interviews/[sessionId]/answers/route.ts:

~~~typescript
import { z } from "zod";
import { SellerAnswerSchema } from "@/features/interviews/answer-application";
import { answerInterview } from "@/features/interviews/interview-service";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { loadIntelligence } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

const AnswerRequestSchema = SellerAnswerSchema.extend({
  evidenceText: z.string().max(20000).nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  return withApiErrors(async () => {
    const { sessionId } = await context.params;
    const body = AnswerRequestSchema.parse(await request.json());
    const dependencies = getApplicationDependencies();
    const session = await dependencies.sessions.get(sessionId);
    if (!session) throw new Error("INTERVIEW_SESSION_NOT_FOUND");
    const intelligence = await loadIntelligence(
      session.productId,
      dependencies,
    );
    return apiSuccess(
      await answerInterview(
        sessionId,
        body,
        { ...dependencies, intelligence },
      ),
    );
  });
}
~~~

web/src/app/api/products/[productId]/simulate/route.ts:

~~~typescript
import { z } from "zod";
import { simulateRecommendation } from "@/features/recommendation/simulate-recommendation";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const SimulationRequestSchema = z.object({
  query: z.string().min(5).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = await context.params;
    const { query } = SimulationRequestSchema.parse(await request.json());
    return apiSuccess(
      await simulateRecommendation(
        productId,
        query,
        getApplicationDependencies(),
      ),
    );
  });
}
~~~

web/src/app/api/market-signals/import/route.ts:

~~~typescript
import { z } from "zod";
import { importMarketSignals } from "@/features/market/import-market-signals";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ImportRequestSchema = z.object({
  signals: z.array(z.unknown()).min(1).max(1000),
});

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const { signals } = ImportRequestSchema.parse(await request.json());
    const dependencies = getApplicationDependencies();
    const imported = await importMarketSignals(signals, {
      embeddings: dependencies.embeddings,
      market: dependencies.market,
    });
    return apiSuccess({ importedCount: imported.length }, 201);
  });
}
~~~

- [ ] **Step 8: Verify and commit the API**

Run:

~~~powershell
npm test -- src/services/application-service.test.ts src/app/api/products/route.test.ts
npm run typecheck
npm run lint
git add web/src/app/api web/src/lib/api-response.ts web/src/services web/src/data/running-shoes-category.json
git commit -m "feat: expose AgentReady application API"
~~~

Expected: route tests, type-check, and lint pass.

### Task 11: Build the seller optimization interface

**Files:**

- Create: web/src/app/products/new/page.tsx
- Create: web/src/app/products/[productId]/page.tsx
- Create: web/src/components/product-dashboard.tsx
- Create: web/src/components/import-listing-form.tsx
- Create: web/src/components/import-listing-form.test.tsx
- Create: web/src/components/readiness-breakdown.tsx
- Create: web/src/components/product-passport-panel.tsx
- Create: web/src/components/evidence-badge.tsx
- Create: web/src/components/gap-list.tsx
- Create: web/src/components/seller-chat.tsx
- Create: web/src/components/seller-chat.test.tsx
- Create: web/src/components/market-insights.tsx
- Create: web/src/components/before-after-panel.tsx
- Modify: web/src/app/globals.css
- Modify: web/src/app/layout.tsx

**Interfaces:**

- Consumes: the Task 10 JSON API
- Produces: listing import, analysis progress, three-panel product dashboard, seller interview, evidence entry, market context, and before-and-after simulation

- [ ] **Step 1: Define the visual system**

Use a Rezolve-inspired enterprise AI-commerce visual language with these UI decisions:

- Light blue-white canvas: #F7FAFF; white surfaces: #FFFFFF.
- Navy text: #101828; muted text: #475467; cool-gray borders: #D0D5DD.
- Primary blue: #2563EB; emphasis gradient: #2563EB to #4F46E5; dark-navy feature surface: #0B1535.
- Verified green: #16865A.
- Missing red: #D14545.
- Inferred amber: #C27A10.
- Rounded cards with 18 px radius.
- Use outcome-led headings, compact uppercase labels, soft blue shadows, and visible keyboard focus rings.
- Desktop dashboard uses a 5-column grid: chat spans 2 columns, passport spans 2 columns, scores span 1 column.
- Mobile stacks chat, passport, then scores.
- Use motion only through CSS transitions so the application has no animation runtime dependency.
- Respect prefers-reduced-motion.

Add CSS variables and reduced-motion styles to globals.css.

- [ ] **Step 2: Write the failing import-form test**

Create web/src/components/import-listing-form.test.tsx:

~~~tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportListingForm } from "./import-listing-form";

describe("ImportListingForm", () => {
  it("submits pasted listing text", async () => {
    const onImported = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: { productIds: ["product-1"] },
            requestId: "request-1",
          }),
          { status: 201 },
        ),
      ),
    );
    render(<ImportListingForm onImported={onImported} />);
    await userEvent.type(
      screen.getByLabelText("Product listing"),
      "CloudRun Pro lightweight shoe",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Analyze listing" }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/products",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onImported).toHaveBeenCalledWith("product-1");
  });
});
~~~

- [ ] **Step 3: Implement listing import**

Create web/src/components/import-listing-form.tsx as a client component. It must:

1. Render Text, JSON, and CSV tabs.
2. Require non-empty content.
3. POST format and content to /api/products.
4. POST an empty object to /api/products/{id}/extract after import.
5. Display separate import and analysis progress messages.
6. Call onImported(productId) after analysis.
7. Render the shared API error message and requestId on failure.

Create web/src/app/products/new/page.tsx as a client page that passes router.push("/products/" + productId) to onImported.

- [ ] **Step 4: Implement provenance and Product Passport views**

Create EvidenceBadge with these labels and colours:

~~~typescript
const evidencePresentation = {
  verified: { label: "Verified", className: "bg-emerald-100 text-emerald-800" },
  seller_declared: { label: "Seller declared", className: "bg-blue-100 text-blue-800" },
  ai_inferred: { label: "AI inferred", className: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", className: "bg-red-100 text-red-800" },
} as const;
~~~

ProductPassportPanel must list each expected category feature, show value and unit, attach EvidenceBadge, and animate changed feature keys with a violet outline for 1.5 seconds. It must never render competitor observations as product features.

- [ ] **Step 5: Implement explainable score views**

ReadinessBreakdown displays a circular total and five horizontal component bars. MarketInsights displays:

- Top retrieved user concerns by total frequency.
- Peer feature coverage percentages.
- Numeric peer medians.
- Source labels and observation dates.

GapList displays each gap with priority, reason, question, and evidence requirement. Scores must be presented as benchmarks, never guaranteed rank.

- [ ] **Step 6: Write the failing seller-chat test**

Create web/src/components/seller-chat.test.tsx:

~~~tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SellerChat } from "./seller-chat";

describe("SellerChat", () => {
  it("submits a seller answer and evidence text", async () => {
    const onUpdate = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              passport: { productId: "product-1" },
              evaluation: { gaps: [] },
              nextGap: null,
            },
            requestId: "request-1",
          }),
          { status: 200 },
        ),
      ),
    );
    render(
      <SellerChat
        sessionId="session-1"
        gap={{
          featureKey: "weight",
          label: "Measured weight",
          reason: "missing",
          priority: 90,
          question: "What is the measured weight?",
          evidenceRequested: true,
        }}
        onUpdate={onUpdate}
      />,
    );
    await userEvent.type(screen.getByLabelText("Your answer"), "220");
    await userEvent.type(
      screen.getByLabelText("Supporting evidence"),
      "Specification sheet: weight 220 g at men's US 9.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));

    expect(fetch).toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalled();
  });
});
~~~

- [ ] **Step 7: Implement the seller chat**

SellerChat must:

- Start an interview if no session exists.
- Display one question at a time.
- Support string, number, boolean, and multi-select values based on FeatureDefinition.
- Provide unit input when the definition has a unit.
- Provide supporting-evidence text when evidenceRequested is true.
- Provide an Unknown button.
- Disable submission during a request.
- Preserve the current question after a recoverable API failure.
- Announce score changes through an aria-live region.

The answer endpoint payload is:

~~~json
{
  "featureKey": "weight",
  "label": "Measured weight",
  "value": 220,
  "unit": "g",
  "unknown": false,
  "evidenceId": null,
  "evidenceText": "Specification sheet: weight 220 g at men's US 9."
}
~~~

- [ ] **Step 8: Implement simulation comparison**

BeforeAfterPanel accepts one buyer query, POSTs it to /api/products/{productId}/simulate, and renders two columns:

- Original listing result.
- Optimized listing result.

For the target product, show eligibility, rank, fit score, matched facts, failed constraints, and missing evidence. Animate only the changed fields. Preserve both results on screen after the request completes.

- [ ] **Step 9: Assemble the product dashboard**

Create ProductDashboard as a client component that:

1. Fetches GET /api/products/{productId}.
2. POSTs /api/products/{productId}/evaluate and stores the returned intelligence.
3. Starts an interview when the seller opens the Coach panel.
4. Refreshes local passport and evaluation state after each answer.
5. Passes Product Passport data to ProductPassportPanel.
6. Passes scores to ReadinessBreakdown.
7. Passes gaps to GapList.
8. Displays MarketInsights from the evaluation response.
9. Displays BeforeAfterPanel beneath the three-column workspace.

Create web/src/app/products/[productId]/page.tsx:

~~~tsx
import { ProductDashboard } from "@/components/product-dashboard";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductDashboard productId={productId} />;
}
~~~

- [ ] **Step 10: Verify accessibility and commit the UI**

Run:

~~~powershell
npm test -- src/components src/app/page.test.tsx
npm run typecheck
npm run lint
npm run build
git add web/src/app web/src/components
git commit -m "feat: build seller optimization workspace"
~~~

Expected: component tests, type-check, lint, and production build pass.

### Task 12: Seed the demo, verify end to end, and deploy

**Files:**

- Create: web/src/data/demo-products.json
- Create: web/src/data/demo-queries.json
- Create: web/src/data/demo-market-signals.json
- Create: web/src/data/seed-demo.ts
- Create: web/e2e/seller-optimization.spec.ts
- Create: web/playwright.config.ts
- Create: web/README.md
- Modify: web/package.json

**Interfaces:**

- Consumes: the complete application API and hosted or local Supabase
- Produces: deterministic demo data, a three-minute scripted scenario, end-to-end verification, and a deployable application

- [ ] **Step 1: Create deterministic demo data**

Create demo-products.json with 10 running-shoe products. CloudRun Pro must begin with:

~~~json
{
  "id": "cloudrun-pro",
  "name": "CloudRun Pro",
  "category": "running_shoes",
  "description": "A lightweight and comfortable running shoe suitable for all runners. Made with premium materials.",
  "price": 179,
  "currency": "SGD"
}
~~~

The remaining nine products must have distinct prices, terrain, weights, cushioning, and evidence states so ranking produces visible alternatives.

Create demo-queries.json with at least 20 normalized shopping queries. Include:

~~~json
{
  "id": "humid-half-marathon",
  "query": "I am training for a half marathon in Singapore's humid weather and need lightweight road shoes under S$200.",
  "frequency": 38,
  "featureKeys": ["terrain", "weight", "breathability", "weather_suitability", "distance_suitability", "price"]
}
~~~

Create demo-market-signals.json with:

- One user_query MarketSignal for each demo query.
- At least one competitor_observation per competitor product.
- Numeric price and weight in featureValues.
- Permitted source labels.
- Null sourceUrl for manually curated data.
- Fixed observedAt timestamps on 2026-08-29.

- [ ] **Step 2: Implement an idempotent seed command**

Create web/src/data/seed-demo.ts. It must:

1. Load and validate all three JSON files.
2. Upsert category and feature definitions.
3. Import market signals and embeddings.
4. Import products through JsonCatalogAdapter.
5. Extract Product Passports for the nine competitor products.
6. Leave CloudRun Pro in its intentionally weak initial state.
7. Print created identifiers and counts.
8. Exit nonzero if any record fails validation.

Add:

~~~json
{
  "scripts": {
    "seed:demo": "tsx src/data/seed-demo.ts"
  }
}
~~~

Run:

~~~powershell
npm run seed:demo
npm run seed:demo
~~~

Expected: both runs succeed and the second run does not duplicate products or signals.

- [ ] **Step 3: Configure Playwright**

Create web/playwright.config.ts:

~~~typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
~~~

Install the browser:

~~~powershell
npx playwright install chromium
~~~

- [ ] **Step 4: Write the complete seller-optimization test**

Create web/e2e/seller-optimization.spec.ts:

~~~typescript
import { expect, test } from "@playwright/test";

test("seller improves a listing and recommendation outcome", async ({
  page,
}) => {
  await page.goto("/products/new");
  await page.getByLabel("Product listing").fill(
    [
      "CloudRun Pro",
      "A lightweight and comfortable running shoe suitable for all runners.",
      "Made with premium materials. Price: S$179.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Analyze listing" }).click();
  await expect(page.getByText("AI Readiness")).toBeVisible();
  const initialScore = await page
    .getByTestId("readiness-total")
    .textContent();

  await page.getByRole("button", { name: "Open seller coach" }).click();
  await expect(page.getByText(/measured weight/i)).toBeVisible();
  await page.getByLabel("Your answer").fill("220");
  await page.getByLabel("Supporting evidence").fill(
    "Specification sheet: CloudRun Pro weighs 220 g at men's US size 9.",
  );
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByText("Verified")).toBeVisible();

  await page.getByLabel("Buyer query").fill(
    "I am training for a half marathon in Singapore's humid weather and need lightweight road shoes under S$200.",
  );
  await page.getByRole("button", { name: "Compare recommendations" }).click();
  await expect(page.getByRole("heading", { name: "Before" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After" })).toBeVisible();

  const finalScore = await page
    .getByTestId("readiness-total")
    .textContent();
  expect(Number(finalScore)).toBeGreaterThan(Number(initialScore));
});
~~~

- [ ] **Step 5: Run the complete verification suite**

Run:

~~~powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e
~~~

Expected: every command exits with code 0. The Playwright HTML report contains a passing seller-optimization journey.

- [ ] **Step 6: Conduct adversarial acceptance checks**

Run these manual tests:

1. Submit an empty listing and confirm a 400 response.
2. Submit malformed CSV and confirm a row-specific error.
3. Answer Unknown and confirm no value is created.
4. Provide evidence that contradicts the claim and confirm the claim remains seller-declared.
5. Use a query whose budget is below every product and confirm no product is eligible.
6. Use a high-similarity product above budget and confirm it remains ineligible.
7. Import a competitor observation and confirm it never appears as a seller claim.
8. Disconnect market retrieval and confirm static ontology evaluation still works with reduced benchmark confidence.
9. Repeat the same evaluation and confirm identical scores.
10. Export the Product Passport and validate it with ProductPassportSchema.

- [ ] **Step 7: Add operational documentation**

Create web/README.md with:

- Product summary.
- Architecture flow.
- Required Node version.
- Local Supabase commands.
- Environment variable names without secret values.
- Installation and seed commands.
- Test commands.
- Vercel deployment steps.
- Controlled-demo limitation when authentication is absent.
- Data provenance policy.
- Three-minute demo script.

The demo script must follow this order:

1. Show the weak CloudRun Pro listing.
2. Show initial AI Readiness and market-demand gaps.
3. Answer measured weight with evidence.
4. Answer terrain and humid-weather suitability.
5. Show the Product Passport updating.
6. Run the saved buyer query.
7. Compare before and after eligibility, rank, and evidence.
8. Export the final Product Passport.

- [ ] **Step 8: Deploy**

Create a Vercel project with Root Directory set to web. Configure:

- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- OPENAI_EXTRACTION_MODEL
- OPENAI_QUERY_MODEL
- OPENAI_EMBEDDING_MODEL

Deploy a preview, run the Playwright test against the preview base URL, then promote the verified deployment.

Expected: the deployed application completes the scripted demo without exposing server credentials in browser network responses or client bundles.

- [ ] **Step 9: Final verification and commit**

Run:

~~~powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e
git add web
git commit -m "feat: complete AgentReady Coach demo"
git status --short
~~~

Expected: all checks pass, the final commit succeeds, and git status is empty.

## Foundation audit and parallel implementation

The current repository contains the source implementation for Tasks 1 and 2:

- Task 1 has the `web/` Next.js foundation, scripts for test, type-check, lint, build, and end-to-end testing, the landing page, and its component test.
- Task 2 has the Product Passport, market, evaluation, and recommendation Zod contracts, inferred TypeScript types, validation tests, and reusable fixtures.
- The source files pass repository whitespace checks and static contract checks.
- Runtime verification remains a Gate 1 requirement. The environment used to create the foundation was Node `v25.3.0` instead of the required Node 24 LTS, npm registry access was unavailable, and `web/package-lock.json` could not be generated. Role 1 must install dependencies with Node 24 LTS and commit the generated lockfile before claiming Gate 1 complete.

### Phase 0: foundation checkpoint

This is the only short sequential step. It prevents four branches from inventing incompatible interfaces.

1. Role 1 owns the Next.js scaffold, `web/package.json`, tooling configuration, and dependency installation for Task 1.
2. Role 3 owns the Task 2 schemas and fixtures. It publishes the interface map and example JSON payloads.
3. All four engineers review the domain contracts and API payload shapes for 15 minutes.
4. Merge both foundation commits into `integration/hackathon`.
5. Role 1 runs `npm install`, commits `web/package-lock.json`, and records Node, npm, test, type-check, lint, and build output.

Roles 2 and 4 may prepare mock AI responses and UI layouts while this checkpoint is running, but they must not modify shared contracts.

### Role 1: platform, database, catalog, and API infrastructure

Branch: `feat/platform-data`

Owns Tasks 4 and 5, the Route Handler and dependency-container portion of Task 10, and the persistence portion of Task 12. It is also the owner of Task 1's package and tooling files.

Files owned:

```text
web/package.json
web/package-lock.json
web/vitest.config.ts
web/src/test/setup.ts
web/next.config.ts
web/eslint.config.mjs
web/postcss.config.mjs
web/tsconfig.json
web/supabase/**
web/src/lib/env.ts
web/src/lib/supabase-admin.ts
web/src/lib/api-response.ts
web/src/services/repositories/**
web/src/services/container.ts
web/src/features/catalog/**
web/src/app/api/**
web/src/data/seed-demo.ts
web/.env.example
```

Deliverables:

- Supabase migrations and RLS policies.
- `ProductRepository`, `MarketRepository`, and `SessionRepository` implementations plus in-memory fakes.
- Text, JSON, and CSV catalog adapters.
- Shared API success and error envelopes.
- Route handlers that call Role 3 application services rather than implementing business rules.
- An idempotent demo seed command.

Role 1 must not change `src/domain/**` or place scoring logic in API routes. A schema or migration request from another role is made as a small interface change for Role 1 to apply.

### Role 2: extraction, embeddings, RAG, and market intelligence

Branch: `feat/ai-rag`

Owns Task 6, Task 7, and the AI verification portion of Task 8.

Files owned:

```text
web/src/lib/openai.ts
web/src/services/embeddings.ts
web/src/features/extraction/**
web/src/features/market/**
web/src/data/running-shoes-category.json
web/src/data/demo-market-signals.json
```

Deliverables:

- OpenAI Structured Outputs gateway with retry and schema validation.
- Product Passport and QueryIntent extraction against the frozen Zod schemas.
- Embedding service using `text-embedding-3-small` and 1536 dimensions.
- Category ontology, market-signal import, and category-filtered hybrid retrieval.
- Evidence-aware verification helpers that never turn competitor observations into seller claims.
- Fake AI and retrieval implementations so Role 3 can test without network calls.

Role 2 must not assign readiness or competitiveness scores. It supplies structured facts, retrieved context, citations, and confidence for Role 3's deterministic engine.

### Role 3: domain engine, seller interview, and application services

Branch: `feat/domain-engine`

Owns Task 2, Task 3, Task 8's interview orchestration, Task 9, and the application-service portion of Task 10. It is the sole owner of shared domain contracts after Phase 0.

Files owned:

```text
web/src/domain/**
web/src/test/fixtures.ts
web/src/features/evaluation/**
web/src/features/interviews/**
web/src/features/recommendation/**
web/src/services/application-service.ts
```

Deliverables:

- Deterministic AI Readiness and Competitiveness calculations.
- Demand-weighted gap prioritisation and seller question generation.
- Provenance transitions for seller answers, evidence, Unknown, and contradictions.
- QueryIntent parsing, hard-constraint filtering, candidate ranking, and explanations.
- Before-and-after simulation using the same query and scoring version.
- Application services that compose Role 1 repositories and Role 2 AI interfaces.
- Unit and service tests using in-memory fixtures.

Role 3 must not call Supabase or OpenAI directly. The application service receives interfaces from the dependency container and keeps business rules independent of infrastructure.

### Role 4: frontend, demo experience, and end-to-end QA

Branch: `feat/frontend-demo`

Owns Task 11 and the presentation, demo-data, and end-to-end portions of Task 12.

Files owned:

```text
web/src/app/products/**
web/src/components/**
web/src/app/globals.css
web/src/app/layout.tsx
web/src/data/demo-products.json
web/src/data/demo-queries.json
web/e2e/**
web/playwright.config.ts
web/README.md
```

Deliverables:

- Listing import screen.
- Product Passport and provenance views.
- Readiness, competitiveness, market-insight, and gap panels.
- One-question seller coach with evidence input and Unknown handling.
- Before-and-after recommendation comparison.
- Playwright coverage for the three-minute demo.
- Deterministic demo products and buyer queries.
- Local setup, demo, testing, and deployment documentation.

Role 4 starts with mocked API responses and does not wait for Supabase or OpenAI. It must not duplicate evaluation logic in React components or edit `web/src/app/api/**`.

### Interface hand-offs

| Producer | Contract or output | Consumer |
|---|---|---|
| Role 1 | Repository interfaces, catalog records, API envelopes | Roles 2 and 3; Route Handlers consume Role 3 services |
| Role 2 | `AiGateway`, `EmbeddingService`, extraction output, retrieved market context | Role 3 and Role 1 seed command |
| Role 3 | Application services and typed API response shapes | Role 1 Route Handlers and Role 4 UI |
| Role 4 | E2E failures, accessibility findings, and demo acceptance evidence | All roles during integration |

The existing interface map is authoritative for repository method names. If a new field is needed, Role 3 updates the domain contract first, then the producer and consumer update their own modules in separate commits.

### Integration checkpoints

1. Foundation: Tasks 1 and 2, contracts, fixtures, and the real lockfile are merged.
2. Interface: every role has a testable fake or fixture and publishes the exact inputs and outputs it expects.
3. Backend: Role 1 repositories and Role 2 services are wired into Role 3 application services.
4. UI: Role 4 switches from mocks to the integrated API and runs the full seller journey.
5. Release: run tests, type-check, lint, build, seed twice, Playwright, and the adversarial acceptance checks before merging `integration/hackathon` to `main`.

Merge order should be Role 1, Role 2, Role 3, then Role 4. Each role opens a small pull request into `integration/hackathon`; `main` remains the stable branch.

## Milestone gates

### Gate 1: Product truth

Tasks 1 through 6 are complete. A listing imports, extracts, validates, persists, and embeds.

### Gate 2: Explainable optimization

Tasks 7 and 8 are complete. RAG produces category intelligence, evaluation identifies gaps, and the seller interview updates the passport with provenance.

### Gate 3: Recommendation proof

Task 9 is complete. Hard constraints, semantic candidates, ranking, and before-and-after comparison work deterministically.

### Gate 4: Demo-ready application

Tasks 10 through 12 are complete. The API, interface, seed data, end-to-end test, and deployment pass.

## Plan self-review record

- Spec coverage: every MVP goal and acceptance criterion maps to Tasks 5 through 12.
- Scope: one category and controlled demo deployment remain explicit.
- Type consistency: ProductPassport, CategoryIntelligence, ListingEvaluation, QueryIntent, repository methods, and evidence statuses use the same names throughout.
- Trust boundary: competitors and user queries influence market intelligence only.
- Determinism: LLMs extract structured inputs, while scores, gap priority, hard constraints, and rank are code-driven.
- Verification: each domain task has a failing-test step, a passing-test step, and a commit boundary.

## Execution handoff

Plan implementation should start only after this specification and plan are reviewed.

Two execution options:

1. Subagent-Driven, recommended: dispatch a fresh implementer for each task and review between tasks.
2. Inline Execution: execute tasks in this session in batches with review checkpoints.
