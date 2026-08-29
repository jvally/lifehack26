# RET-AI-L Ready

RET-AI-L Ready helps brands make product data understandable, trustworthy, and measurable in AI-mediated commerce. It turns incomplete e-commerce listings into evidence-aware Product Passports, identifies the facts that stop an AI shopper from recommending a product, and guides sellers through the highest-impact improvements.

The demo uses running shoes because constraints such as weight, terrain, weather, and price make the recommendation journey easy to see. The model is reusable across clothing, furniture, accessories, makeup, groceries, and sports equipment.

## Why brands use it

AI shopping agents need more than persuasive product copy: they need explicit, current, and supported facts. RET-AI-L Ready gives brands a measurable way to improve those signals.

| Brand challenge | RET-AI-L Ready capability | Outcome |
| --- | --- | --- |
| Listings are incomplete or inconsistent | Evidence-aware Product Passport | Clear, structured product truth |
| AI agents cannot prove product fit | Agent-readiness optimiser | Prioritised improvements that unlock eligibility |
| Teams do not know where they lose discovery | AI visibility tracker | Demand-weighted shopper-intent coverage and missed opportunities |
| Buyers value different trade-offs | Preference-matching engine | Performance, value, sustainability, and balanced buyer simulations |
| Agent-influenced demand is difficult to measure | Referral-token attribution | A trackable event trail for recommendations, views, and conversions |
| Updating a PIM or storefront is risky | Implementation patch | Reviewed, adapter-neutral changes rather than silent writes |

The core value loop is: **improve product truth → validate AI visibility → measure downstream interest**.

## End-to-end process

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

1. The brand imports a listing as text, JSON, or CSV.
2. RET-AI-L Ready detects its category and creates a structured Product Passport.
3. Every product fact is marked `verified`, `seller_declared`, `ai_inferred`, or `missing`.
4. Category requirements, shopper-query signals, and permitted competitive observations create readiness and competitiveness diagnostics.
5. The Seller Coach asks one highest-impact question at a time and recalculates the product after every answer.
6. The same shopper query runs against the original and improved Passport to prove changes in eligibility, rank, and matched evidence.
7. The visibility tracker shows which demand-weighted shopper intents the listing can answer.
8. The brand downloads an implementation patch to review and apply in its existing catalog system.

## Architecture

The application is a Next.js interface and server API, backed by Supabase/PostgreSQL and pgvector. OpenAI is used for structured extraction, buyer-intent parsing, evidence review, and embeddings. Deterministic domain logic handles scoring and ranking.

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

### System responsibilities

- **Catalog adapters:** normalise text, JSON, CSV, and future connector records into one input contract.
- **Product extraction:** creates a schema-validated Product Passport but never promotes model output to verified evidence on its own.
- **Market intelligence:** retrieves category-specific query signals and permitted competitor observations.
- **Evaluation:** produces deterministic and explainable readiness, competitiveness, and gap scores.
- **Seller interview:** chooses the next unanswered, high-impact fact to confirm.
- **Recommendation:** filters hard constraints before ranking by semantic relevance, preference coverage, and evidence quality.
- **Attribution:** records referral-token events from an integrated channel; it does not claim access to third-party AI conversion data by default.

## Generalising to any product category

RET-AI-L Ready has a shared core Product Passport—name, description, price, evidence, provenance, use cases, contexts, and limitations—plus category-specific feature definitions.

```text
Shared Product Passport
          +
Category definition: features, types, units, synonyms,
evidence rules, demand weights, and constraint importance
          =
Recommendation-ready category model
```

| Current category | Example facts |
| --- | --- |
| Running shoes | Weight, terrain, breathability, distance suitability |
| Clothing | Material, fit, size range, care |
| Furniture | Dimensions, material, assembly, delivery |
| Accessories | Material, compatibility, durability, warranty |
| Makeup | Shade, skin type, ingredients, finish |
| Groceries | Ingredients, allergens, dietary tags, storage |
| Sports equipment | Equipment type, size, weight, skill level |

Category definitions are reusable but currently versioned in code. To add a new category today, define its features, types, units, synonyms, evidence rules, shopper-intent benchmarks, and competitor observations. The roadmap is a no-code category-pack editor and field-mapping interface so brands can onboard new catalogues without engineering work.

## Integration model

RET-AI-L Ready complements a PIM, ERP, Shopify store, marketplace feed, or custom product database; it does not replace one.

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

Currently, brands can import text, JSON, and CSV, then export an adapter-neutral implementation patch with changed fields, evidence IDs, and rationales. This preserves review and prevents silent catalog mutations.

Planned production integration includes Shopify OAuth/Admin GraphQL sync, generic REST and webhook adapters, brand-specific schema mapping, post-sync re-evaluation, and an audit log. Every external write should remain explicitly approved.

## Design choices and trade-offs

| Choice | Reason | Trade-off |
| --- | --- | --- |
| Structured LLM extraction + deterministic scores | Flexible ingestion without opaque scoring | Extracted facts must be reviewed by the seller |
| Evidence provenance for every fact | Safer, explainable recommendations | Strong claims require supporting evidence |
| Hybrid full-text and vector retrieval | Supports both exact constraints and natural language | Needs embeddings and maintained market signals |
| Hard filters before ranking | Never recommends products that cannot prove a non-negotiable requirement | Incomplete listings may be excluded, deliberately exposing the gap |
| Category definitions instead of one universal schema | Keeps recommendations meaningful across product types | Definitions are code-managed today |
| Implementation patch before direct sync | Keeps brands in control and fits many catalog systems | No one-click PIM or Shopify publishing yet |
| Referral-token attribution | Creates an honest measurement boundary | Only connected channels can report downstream events |
| Offline demo mode | Repeatable hackathon demonstration without secrets | Uses clearly labelled sample data rather than live persistence |

## What is implemented

- Text, JSON, and CSV product import.
- Automatic category detection across seven supported categories.
- Evidence-aware Product Passport extraction.
- Market-aware AI Readiness and Competitiveness scoring.
- Prioritised seller interview and live re-evaluation.
- Before/after recommendation simulation.
- Preference profiles: balanced, performance, value, and sustainability.
- Demand-weighted AI-visibility reporting.
- Referral-token attribution events and API endpoints.
- Machine-readable implementation-patch export.

## Demo script

1. Open **Analyse a listing** and paste the incomplete CloudRun Pro listing.
2. Show the initial readiness score, visibility metrics, and high-priority gaps.
3. Add measured weight with supporting evidence in Seller Coach.
4. Confirm road terrain and humid-weather suitability.
5. Run the half-marathon shopper query with a preference profile.
6. Compare before/after eligibility, rank, matched facts, and evidence.
7. Show the referral-token product-view attribution event.
8. Download the implementation patch for catalog approval.

## Local development

The app lives in [`web/`](web/). Use Node.js 24.

```powershell
cd web
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

For offline demo mode:

```powershell
$env:NEXT_PUBLIC_OFFLINE_DEMO = "true"
npm run dev
```

For live mode, copy `web/.env.example` to `web/.env.local`, set the Supabase and OpenAI variables, apply Supabase migrations, then seed the demo data:

```powershell
cd web
npm run check:release-env
npx supabase db push
npx supabase db lint
npm run seed:release
npm run dev
```

See [`web/README.md`](web/README.md) for the application-level setup and deployment reference.

## Production boundary

This build is designed for a controlled demonstration. A public production rollout still needs authentication, product ownership, user-scoped row-level security, rate limiting, consent and privacy review, approved catalog connectors, and a production-grade audit trail.
