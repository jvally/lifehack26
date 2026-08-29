# AgentReady Coach Design Specification

**Date:** 2026-08-29

**Status:** Approved concept, pending implementation

## 1. Product summary

AgentReady Coach is a RAG-powered product-listing optimization application for sellers and catalog managers. It converts an incomplete listing into a structured Product Passport, evaluates the listing against category requirements, user-query demand, and permitted competitive observations, then interviews the seller to close the highest-impact information gaps.

The application proves value with a before-and-after recommendation test. A simulated AI shopper evaluates the product before the interview, the seller supplies missing specifications or evidence, and the same query runs again against the improved Product Passport.

## 2. Problem

Product listings are usually written for human browsing and keyword search. AI shopping agents need explicit, normalized, and trustworthy facts to determine:

- Whether a product satisfies hard constraints.
- Whether it suits a use case, person, or environment.
- How it compares with alternatives.
- Which claims are verified, seller-declared, inferred, or missing.
- Whether price, availability, and other volatile facts are current.

Sellers do not know which omissions prevent an AI agent from recommending their products. Existing copy generators can make a listing longer without making it more complete, grounded, or machine-readable.

## 3. Product proposition

AgentReady Coach asks the seller the single unanswered question with the greatest expected impact on AI recommendation coverage.

The system combines:

- A category feature ontology.
- Aggregated and anonymized user-query signals.
- Permitted competitive listing observations.
- Hybrid keyword and vector retrieval.
- A deterministic and explainable evaluation engine.
- An evidence-aware seller chatbot.
- A before-and-after recommendation simulator.

## 4. Users

### Primary user

A marketplace seller or catalog manager improving one product listing at a time.

### Secondary user

A brand team reviewing catalog quality and competitive coverage across multiple products.

## 5. Hackathon assumptions

- The implementation window is 24 to 48 hours.
- The team has three to four members.
- The initial demonstration uses one category, running shoes.
- The initial catalog contains 10 to 20 products.
- The benchmark contains 20 to 50 representative shopping queries.
- Competitive data is supplied, licensed, or manually curated for the demonstration.
- User-query data is aggregated and contains no personal identifiers.
- An OpenAI API key and a hosted Supabase project are available.
- The challenge database, when provided, remains the source of truth and is accessed through a replaceable catalog adapter.

## 6. Goals

The MVP must:

1. Import an existing product listing from text, JSON, or CSV.
2. Extract a schema-valid Product Passport.
3. Keep every fact linked to provenance and confidence.
4. Retrieve category intelligence from user queries and competitive observations.
5. Calculate separate AI Readiness and Competitiveness scores.
6. Explain every score component and gap.
7. Ask one prioritized seller question at a time.
8. Update the Product Passport and evaluation after each answer.
9. Run the same buyer query before and after optimization.
10. Export the improved Product Passport as JSON.

## 7. Non-goals for the MVP

- Scraping unapproved websites.
- Training or fine-tuning a foundation model.
- Supporting every retail category.
- Predicting sales or guaranteed marketplace rank.
- Automatically publishing seller changes.
- Adding claims without seller confirmation or supporting evidence.
- Building a production billing, organization, or role-management system.
- Replacing a retailer's product information management system.

## 8. User experience

### 8.1 Import

The seller pastes a listing or uploads CSV or JSON. The application displays the original listing and begins extraction.

### 8.2 Initial diagnosis

The dashboard shows:

- AI Readiness score.
- Competitiveness score.
- Product Passport.
- High-impact missing fields.
- Confidence and evidence status for each claim.
- Representative queries the product cannot currently answer.

### 8.3 Seller interview

The chatbot asks one question at a time. Each question states why the answer matters and provides category-specific choices when suitable.

Example:

> Your listing says the shoe is lightweight, but gives no measured weight. Weight appears in 38 percent of relevant queries. What is the weight per shoe and reference size?

The seller may provide an answer, attach evidence, confirm an inference, or choose Unknown.

### 8.4 Live update

After each accepted answer:

- The Product Passport updates.
- The modified feature is highlighted.
- The score breakdown recalculates.
- Newly covered shopping intents appear.
- The next highest-impact question is selected.

### 8.5 Recommendation proof

The application reruns a saved buyer query using the original and current Product Passports. It shows:

- Eligibility.
- Rank.
- Matched constraints.
- Missing or unsupported requirements.
- Evidence-grounded recommendation explanation.

## 9. Architecture

The MVP is a single Next.js application with explicit domain modules. Next.js Route Handlers form the server API. Supabase PostgreSQL stores relational records, JSONB Product Passports, full-text indexes, and pgvector embeddings.

~~~text
Seller listing or challenge database
                 |
                 v
        Catalog source adapter
                 |
                 v
        Product Truth Extractor
                 |
                 v
          Product Passport
                 |
        +--------+---------+
        |                  |
        v                  v
Market RAG retrieval   Deterministic rules
        |                  |
        +--------+---------+
                 |
                 v
        Listing Evaluation
                 |
                 v
       Question Priority Engine
                 |
                 v
          Seller Interview
                 |
                 v
      Updated Product Passport
                 |
                 v
    Recommendation Simulator
~~~

## 10. Module boundaries

### Catalog adapters

Convert text, CSV, JSON, or a challenge database record into RawProductInput. Adapters do not perform scoring or call the LLM.

### Product extraction

Converts RawProductInput into ProductPassport using Structured Outputs. It preserves source text and marks model-extracted fields as ai_inferred until confirmed.

### Market intelligence

Stores normalized category features, query-intent signals, and competitor observations. RAG retrieves only records from the same category and returns citations to the internal source records.

### Evaluation

Uses deterministic functions to calculate score components, identify contradictions, measure demand-weighted intent coverage, and produce gaps. The LLM does not assign scores.

### Interview orchestration

Ranks gaps, creates a seller-facing question, validates the answer, records provenance, and triggers reevaluation.

### Recommendation simulation

Parses a buyer query into structured intent, applies hard filters, ranks eligible products, and produces an explanation using Product Passport facts only.

### Presentation

Displays the chat, Product Passport, score breakdown, market benchmark, and recommendation comparison. Presentation components consume typed view models and contain no scoring logic.

## 11. Core domain contracts

~~~typescript
type EvidenceStatus =
  | "verified"
  | "seller_declared"
  | "ai_inferred"
  | "missing";

type FeatureValue = {
  key: string;
  label: string;
  value: string | number | boolean | string[] | null;
  unit: string | null;
  status: EvidenceStatus;
  confidence: number;
  evidenceIds: string[];
};

type ProductPassport = {
  productId: string;
  name: string;
  category: string;
  description: string;
  price: number | null;
  currency: string | null;
  features: FeatureValue[];
  useCases: string[];
  suitableContexts: string[];
  limitations: string[];
  updatedAt: string;
};

type QueryIntent = {
  category: string;
  goal: string | null;
  hardConstraints: Record<string, string | number | boolean>;
  preferences: string[];
  contexts: string[];
};
~~~

## 12. Category intelligence model

Each category feature definition contains:

- Canonical key.
- Human-readable label.
- Data type.
- Optional unit.
- Synonyms.
- Whether the feature is required.
- Constraint importance.
- Seller answerability.
- Demand weight derived from aggregated queries.
- Competitive coverage rate.
- Competitive direction: lower, higher, or neutral.
- Evidence requirement.
- Freshness requirement.

The initial running-shoe ontology includes:

- price
- currency
- sizes
- weight
- reference_size
- terrain
- cushioning
- stability
- upper_material
- breathability
- weather_suitability
- distance_suitability
- sustainability_claims
- return_policy

## 13. RAG design

### 13.1 Indexed sources

- Aggregated user queries.
- Curated competitive listing snippets.
- Category feature definitions.
- Supporting evidence uploaded for the current product.

Each competitor observation stores normalized feature values separately from
its source text so peer medians can be calculated without asking the LLM to
compare free-form descriptions during evaluation.

### 13.2 Retrieval

Every retrieval request filters by category before ranking. The database combines:

- PostgreSQL full-text search for exact terms and specifications.
- pgvector semantic search for intents, use cases, and synonyms.
- Reciprocal rank fusion to merge the result sets.

### 13.3 RAG responsibilities

RAG may:

- Retrieve common category requirements.
- Retrieve high-demand query intents.
- Retrieve synonymous buyer expressions.
- Retrieve competitive coverage and specification observations.
- Supply source records for explanations.

RAG may not:

- Turn a competitor claim into truth for the seller's product.
- infer a missing specification as fact.
- determine the final score.
- override hard constraints.

## 14. Scoring

All component scores range from 0 to 100.

### 14.1 AI Readiness

~~~text
AI Readiness =
  0.30 * completeness
  + 0.25 * intent coverage
  + 0.20 * evidence quality
  + 0.15 * discoverability
  + 0.10 * consistency and freshness
~~~

Definitions:

- Completeness is the weighted proportion of expected category fields that have non-null values.
- Intent coverage is the demand-weighted proportion of benchmark intents whose hard requirements are satisfied and whose important preferences are represented.
- Evidence quality weights verified claims as 1.0, seller-declared claims as 0.6, AI-inferred claims as 0.25, and missing claims as 0.
- Discoverability measures coverage of canonical terms, synonyms, use cases, and contexts present in market signals.
- Consistency and freshness begins at 100 and applies explicit penalties for contradictions, invalid units, and expired volatile data.

### 14.2 Competitiveness

~~~text
Competitiveness =
  0.35 * peer feature coverage
  + 0.25 * differentiation
  + 0.20 * relative specifications
  + 0.10 * price fit
  + 0.10 * high-demand query coverage
~~~

Competitiveness is a benchmark against the selected peer set, not a prediction of sales or marketplace rank.

### 14.3 Question priority

Each missing or weak feature receives:

~~~text
priority =
  100
  * (
      0.35 * demand weight
      + 0.30 * constraint importance
      + 0.20 * competitive coverage
      + 0.15 * confidence gap
    )
  * answerability
~~~

All factors are normalized between 0 and 1. The highest-priority unanswered gap is asked first.

## 15. Recommendation algorithm

1. Parse the buyer query into QueryIntent.
2. Select products in the requested category.
3. Reject products that violate known hard constraints.
4. Mark unknown hard constraints as insufficient evidence.
5. Retrieve semantic candidates using the buyer goal, preferences, and contexts.
6. Calculate fit using structured feature coverage, semantic similarity, evidence quality, and preference coverage.
7. Rank eligible candidates.
8. Generate an explanation from matched Product Passport fields and their evidence.

The simulator must preserve the original Product Passport snapshot so before-and-after comparisons use the same query and scoring version.

## 16. Persistence

The database contains:

- categories
- feature_definitions
- market_signals
- products
- product_claims
- evaluations
- interview_sessions
- interview_messages
- recommendation_runs

The Product Passport is stored as validated JSONB for hackathon speed. Important queryable fields such as category, product name, price, and timestamps are also stored as columns.

Each current Product Passport also has a 1536-dimensional embedding used to
retrieve semantic product candidates. Structured filters still determine hard
eligibility.

## 17. API surface

### Product endpoints

- POST /api/products imports one listing.
- GET /api/products/{productId} returns the product dashboard view model.
- POST /api/products/{productId}/extract creates or refreshes the Product Passport.
- POST /api/products/{productId}/evaluate calculates readiness, competitiveness, and gaps.
- GET /api/products/{productId}/export returns the current Product Passport as JSON.

### Interview endpoints

- POST /api/products/{productId}/interviews starts a session and returns the first question.
- POST /api/interviews/{sessionId}/answers records one answer, updates the passport, reevaluates, and returns the next question.

### Simulation endpoint

- POST /api/products/{productId}/simulate runs a buyer query against the original and current passports.

### Market endpoint

- POST /api/market-signals/import imports permitted query and competitive observations for the demo dataset.

## 18. Error handling

- Invalid imports return a row-level error report and do not create partial products.
- Schema-invalid LLM output is retried once, then returned as a recoverable extraction failure.
- Missing model output never becomes an empty passport.
- Unknown seller answers keep the field missing and lower its future question priority for the current session.
- Unsupported claims remain seller-declared or ai_inferred and cannot become verified.
- Retrieval failure falls back to the static category ontology and reports reduced benchmark confidence.
- Simulation distinguishes constraint failure from missing evidence.
- API responses use a shared error envelope with code, message, and requestId.

## 19. Security and privacy

- OpenAI and Supabase service keys remain server-side.
- Uploaded evidence has type and size limits.
- Imported content is treated as untrusted data.
- User queries are aggregated and stripped of personal identifiers before ingestion.
- Competitive observations retain source and observation date.
- No automatic publishing or external seller-account changes occur.
- The MVP avoids authentication only when used as a controlled demo. Public deployment requires authentication and row-level access policies.

## 20. Testing strategy

### Unit tests

- Zod domain schemas.
- CSV and JSON adapters.
- Score calculations.
- Gap generation and question ranking.
- Hard-constraint filtering.
- Recommendation ranking.
- Provenance transitions.

### Contract tests

- LLM client returns schema-valid ProductPassport and QueryIntent objects.
- Repository implementations match their interfaces.
- Route handlers return the shared success and error envelopes.

### Integration tests

- Product import through evaluation.
- Seller answer through reevaluation.
- Market retrieval with category filtering.
- Product Passport export.

### End-to-end tests

- Import a weak listing.
- View initial scores.
- Answer three seller questions.
- Observe score and Product Passport changes.
- Run and compare a saved buyer query.
- Export the final Product Passport.

## 21. Demo scenario

The primary demo listing is:

~~~text
CloudRun Pro

A lightweight and comfortable running shoe suitable for all runners.
Made with premium materials. Price: S$179.
~~~

The initial evaluation lacks measured weight, terrain, climate suitability, distance suitability, stability, and evidence.

The seller supplies:

- Road terrain.
- Weight of 220 g at men's US size 9.
- Ventilated mesh evidence.
- Half-marathon suitability.

The saved shopper query is:

~~~text
I am training for a half marathon in Singapore's humid weather and need
lightweight road shoes under S$200.
~~~

The demonstration succeeds when the product changes from insufficient evidence to eligible and receives a higher explainable fit score.

## 22. Acceptance criteria

- All LLM-generated domain objects pass strict Zod validation.
- Every Product Passport feature has a provenance status.
- Scores are deterministic for identical inputs.
- Hard constraints cannot be overridden by semantic similarity or popularity.
- Competitive observations never become seller product claims.
- The chatbot asks the highest-priority unanswered question.
- Selecting Unknown does not fabricate or confirm a value.
- Before-and-after simulation uses the same buyer query and scoring version.
- Recommendation explanations refer only to stored Product Passport facts.
- The complete scripted demo runs in under three minutes.
- The application can export the improved Product Passport as valid JSON.

## 23. Technology decisions

- Node.js 24 LTS.
- Next.js 16.3.3 with App Router and TypeScript.
- React version selected by the Next.js 16.3.3 scaffold.
- Tailwind CSS for styling.
- Supabase PostgreSQL with JSONB, full-text search, and pgvector.
- OpenAI Responses API with Structured Outputs.
- text-embedding-3-small with 1536-dimensional vectors.
- Zod 4 for runtime validation.
- Vitest and React Testing Library for unit and component tests.
- Playwright for end-to-end testing.
- Vercel for the application deployment.

## 24. References

- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Supabase vector columns: https://supabase.com/docs/guides/ai/vector-columns
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- OpenAI developer quickstart: https://platform.openai.com/docs/quickstart/make-your-first-api-request
- OpenAI Node Structured Outputs: https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
