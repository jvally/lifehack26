# RET-AI-L Ready

RET-AI-L Ready helps brands make product data understandable, trustworthy, and measurable in AI-mediated commerce. It turns incomplete listings into evidence-aware Product Passports, identifies the facts that stop an AI shopper from recommending a product, and guides the seller through the highest-impact improvements.

The demo uses running shoes because constraints such as weight, terrain, weather, and price make the recommendation journey easy to understand. The product model is reusable across clothing, furniture, accessories, makeup, groceries, and sports equipment.

## Business value

Brands often have product information written for human browsing, rather than the explicit, reliable facts AI agents need to compare products. RET-AI-L Ready provides four connected capabilities:

- **Agent-readiness optimisation:** finds missing, weakly supported, or inconsistent product facts and prioritises the next seller question by expected recommendation impact.
- **AI visibility tracking:** measures which demand-weighted shopper intents a product can currently satisfy and highlights missed opportunities.
- **Preference matching:** evaluates the same product against shopper priorities such as performance, value, or sustainability.
- **Agent attribution:** creates a referral token for each recommendation and can record subsequent product-view or conversion events from an integrated storefront.

The outcome is a measurable loop: improve product truth, validate that more AI-shopping intents can be served, then connect that improvement to downstream engagement.

## End-to-end workflow

```text
Listing / CSV / JSON / catalog record
                |
                v
      Category detection and import
                |
                v
  LLM-assisted Product Passport extraction
                |
                +------------------------+
                |                        |
                v                        v
  Market-context retrieval        Evidence/provenance model
                |                        |
                +-----------+------------+
                            v
         Deterministic readiness evaluation
                            |
                            v
       Prioritised seller interview and update
                            |
                            v
  Before/after recommendation + visibility + attribution
                            |
                            v
     Approved implementation patch for the brand's systems
```

1. A brand imports a listing as text, JSON, or CSV.
2. The system detects the category and extracts a structured Product Passport.
3. Every extracted fact carries a provenance state: `verified`, `seller_declared`, `ai_inferred`, or `missing`.
4. Category requirements, anonymised query signals, and permitted competitive observations generate readiness and competitiveness diagnostics.
5. The Seller Coach asks one high-impact question at a time. Answers update the Product Passport and scores.
6. The same shopper query is rerun against the original and improved Passport to prove the difference in eligibility, rank, and matched evidence.
7. A benchmark visibility report summarises the demand-weighted intents the product can serve.
8. The brand can export a machine-readable implementation patch instead of giving the app direct write access to its catalog.

## Architecture

The application is a Next.js frontend and API layer with explicit domain modules. Supabase/PostgreSQL stores product records, Product Passports, evidence, market signals, evaluation history, interview sessions, and attribution events. OpenAI is used for structured extraction, buyer-intent parsing, evidence review, and embeddings.

```text
                         +------------------------+
                         |      Next.js UI         |
                         | import / coach / proof  |
                         +-----------+------------+
                                     |
                         +-----------v------------+
                         |     Route handlers      |
                         +-----------+------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
 +-----v------+               +------v-------+              +------v-------+
 | Extraction |               | Evaluation   |              | Recommendation|
 | + evidence |               | + interview  |              | + visibility   |
 +-----+------+               +------+-------+              +------+--------+
       |                             |                             |
       +-----------------------------+-----------------------------+
                                     |
                         +-----------v------------+
                         | Supabase + pgvector     |
                         | products / signals /    |
                         | evidence / events       |
                         +------------------------+
```

### Core domain boundaries

- **Catalog adapters** normalise raw text, JSON, CSV, or future commerce-platform data into a shared input contract.
- **Product extraction** creates a schema-validated Passport; it does not treat model output as verified truth.
- **Market intelligence** retrieves category-specific query and permitted competitor signals.
- **Evaluation** is deterministic and returns explainable scores and gaps.
- **Interview orchestration** chooses the next unanswered, high-impact gap and persists accepted seller answers.
- **Recommendation** applies hard constraints before ranking eligible candidates on semantic relevance, preference coverage, and evidence quality.
- **Attribution** records recommendation-served, product-view, and conversion events with a referral token. It is an integration-ready event trail, not a claim that external agents expose conversion data by default.

## Category generalisation

RET-AI-L Ready uses a shared core Passport—name, description, price, evidence, provenance, use cases, contexts, and limitations—plus category-specific feature definitions.

```text
Shared Product Passport
          +
Category definition: features, types, units, synonyms,
evidence rules, demand weights, and constraint importance
          =
Recommendation-ready category model
```

Current category definitions cover:

| Category | Example features |
| --- | --- |
| Running shoes | Weight, terrain, breathability, distance suitability |
| Clothing | Material, fit, size range, care |
| Furniture | Dimensions, material, assembly, delivery |
| Accessories | Material, compatibility, durability, warranty |
| Makeup | Shade, skin type, ingredients, finish |
| Groceries | Ingredients, allergens, dietary tags, storage |
| Sports equipment | Equipment type, size, weight, skill level |

Today these definitions are versioned in application code. To onboard a new category, add its feature schema, synonyms, evidence requirements, query benchmarks, and competitor observations. The next product step is a configurable category-pack editor and field-mapping interface so a brand can do this without engineering support.

## Integration model

The system complements a PIM, ERP, storefront, or marketplace feed; it does not replace it.

```text
PIM / Shopify / ERP / CSV feed
              |
              v
        RET-AI-L Ready
  audit -> enrich -> approve -> measure
              |
              v
 Implementation patch or approved API sync
              |
              v
 PIM / storefront / marketplace catalogue
```

The current implementation imports text, JSON, and CSV, then exports an adapter-neutral implementation patch containing changed fields, evidence IDs, and reasons. This makes review explicit and avoids silent catalog changes.

Planned production connectors include Shopify OAuth and Admin GraphQL sync, generic REST/webhook adapters, brand-specific field mapping, and post-sync re-evaluation. A production deployment should require explicit approval before every external write and retain an audit trail.

## System-design choices and trade-offs

| Choice | Why | Trade-off |
| --- | --- | --- |
| Structured LLM extraction, deterministic scoring | Flexible input handling without opaque scores | Extraction needs seller review; the model never verifies facts on its own |
| Provenance for every fact | Makes agent recommendations explainable and safer | Requires sellers to supply evidence for the strongest status |
| Hybrid retrieval: full-text + embeddings | Preserves exact constraints while handling natural language | Requires embeddings and maintained market signals |
| Hard filters before ranking | A product that cannot prove a non-negotiable constraint is not recommended | Can reduce recall when listings are incomplete, intentionally surfacing the data gap |
| Category definitions over one universal schema | Keeps recommendations meaningful in very different product categories | Definitions are code-managed today; no-code configuration is a roadmap item |
| Implementation patch before direct sync | Keeps brands in control and is easy to integrate with many systems | Does not yet provide one-click Shopify/PIM publishing |
| Referral-token attribution | Provides an honest integration point for agent-influenced engagement | It records only events sent by a connected channel; it cannot infer third-party AI conversions |
| Offline demo mode | Makes the hackathon story repeatable without secrets | It uses clearly labelled sample data and browser-local mock persistence |

## What is implemented now

- Listing import from text, JSON, and CSV.
- Automatic detection across the supported categories.
- Evidence-aware Product Passport extraction.
- Market-aware AI Readiness and Competitiveness scoring.
- High-impact seller interview and live re-evaluation.
- Before/after recommendation simulation.
- Shopper preference profiles: balanced, performance, value, and sustainability.
- Demand-weighted visibility reporting.
- Referral-token attribution events and API endpoints.
- Machine-readable implementation-patch export.

## Demo flow

1. Open **Analyse a listing** and paste the incomplete CloudRun Pro listing.
2. Show the initial readiness score, visibility metrics, and high-priority evidence gaps.
3. Open the Seller Coach and add measured weight with supporting evidence.
4. Add road-terrain and humid-weather suitability.
5. Review the proposed field-level changes, then choose **Approve and save**.
6. Confirm that the mock brand database record and Product Passport update.
7. Run the half-marathon shopper query using a preference profile.
8. Compare before and after eligibility, rank, matched facts, and evidence.
7. Show the referral token/product-view attribution event.
8. Download the implementation patch for the brand's catalog owner.

## Install and run

Use Node.js 24. From this directory:

```powershell
npm ci
```

### Offline development

Offline mode is deliberate and visibly labelled. It uses local sample data after import and does not persist live API changes.

For the hackathon path, product creation and approved changes are persisted in
browser `localStorage` under `retailready:mock-brand-database:v1`. This simulates
a brand catalog without Shopify credentials. Draft coach answers are kept only in
component state; the database changes only after explicit approval.

The simulated database record is:

```typescript
type MockBrandProduct = {
  id: string;
  sourceFormat: "text" | "json" | "csv";
  sourceListing: string;
  passport: ProductPassport | null;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
};
```

The key demo components are `ImportListingForm` (product creation),
`ProductDashboard` (analysis and record display), `SellerCoach` (questions,
proposal, and approval), `mock-brand-database.ts` (local persistence), and
`BeforeAfterPanel` (buyer eligibility verification). The same UI uses the live
Route Handler and Supabase repositories when offline mode is disabled.

```powershell
$env:NEXT_PUBLIC_OFFLINE_DEMO = "true"
npm run dev
```

Run the browser journey with:

```powershell
npm run e2e:offline
```

### Live local development

Copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_OFFLINE_DEMO=false`, and provide:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=
OPENAI_QUERY_MODEL=
OPENAI_EMBEDDING_MODEL=
```

Then validate and seed the intended Supabase project:

```powershell
npm run check:release-env
npx supabase db push
npx supabase db lint
npm run seed:release
npm run dev
```

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e:offline
```

Deploy with `web` as the application root. Keep the Supabase service-role key and OpenAI key server-side. This build is appropriate for a controlled demonstration; production rollout still needs authentication, product ownership, user-scoped row-level security, rate limiting, consent/privacy review, and approved catalog connectors.
