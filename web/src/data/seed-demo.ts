import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { z } from "zod";
import {
  FeatureDefinitionSchema,
  MarketSignalSchema,
  type FeatureDefinition,
  type MarketSignal,
} from "@/domain/market";
import { JsonCatalogAdapter } from "@/features/catalog/adapters";
import { extractProductPassport } from "@/features/extraction/extract-passport";
import { importMarketSignals } from "@/features/market/import-market-signals";
import type { Database } from "@/lib/database.types";
import { parseEnv } from "@/lib/env";
import type { AiGateway } from "@/services/ai-gateway";
import { getApplicationDependencies } from "@/services/container";
import type { EmbeddingService } from "@/services/embeddings";
import type {
  MarketRepository,
  ProductRepository,
  RawProductInput,
} from "@/services/repositories/contracts";

const DemoProductSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().min(1),
    price: z.number().nonnegative(),
    currency: z.string().length(3),
  })
  .passthrough();

const DemoQuerySchema = z.object({
  id: z.string().min(1),
  query: z.string().min(5),
  frequency: z.number().int().positive(),
  featureKeys: z.array(z.string().min(1)).min(1),
});

export const DemoSeedDataSchema = z
  .object({
    products: z.array(DemoProductSchema).min(10),
    queries: z.array(DemoQuerySchema).min(20),
    marketSignals: z.array(MarketSignalSchema).min(20),
    featureDefinitions: z.array(FeatureDefinitionSchema).min(1),
  })
  .superRefine((data, context) => {
    const querySignalIds = new Set(
      data.marketSignals
        .filter((signal) => signal.signalType === "user_query")
        .map((signal) => signal.id),
    );
    for (const query of data.queries) {
      if (!querySignalIds.has(query.id)) {
        context.addIssue({
          code: "custom",
          path: ["marketSignals"],
          message: `Missing user_query market signal for ${query.id}`,
        });
      }
    }
    if (
      !data.marketSignals.some(
        (signal) => signal.signalType === "competitor_observation",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["marketSignals"],
        message: "At least one competitor observation is required.",
      });
    }
  });

export type DemoSeedData = z.infer<typeof DemoSeedDataSchema>;

export type ProductUpsertResult = {
  inserted: number;
  updated: number;
  products: Array<{ id: string; externalId: string }>;
};

export interface DemoSeedStore {
  upsertCategory(slug: string, name: string): Promise<void>;
  upsertFeatureDefinitions(
    category: string,
    definitions: FeatureDefinition[],
  ): Promise<void>;
  upsertProducts(products: RawProductInput[]): Promise<ProductUpsertResult>;
}

type DemoSeedApplication = {
  importMarketSignals(signals: MarketSignal[]): Promise<unknown>;
  extractProduct(productId: string): Promise<unknown>;
};

type DemoSeedRuntimeDependencies = {
  ai: AiGateway;
  embeddings: EmbeddingService;
  products: ProductRepository;
  market: MarketRepository;
};

export function createDemoSeedApplication(
  dependencies: DemoSeedRuntimeDependencies,
): DemoSeedApplication {
  return {
    importMarketSignals(signals) {
      return importMarketSignals(signals, {
        embeddings: dependencies.embeddings,
        market: dependencies.market,
      });
    },
    async extractProduct(productId) {
      const product = await dependencies.products.get(productId);
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      return extractProductPassport(product, {
        ai: dependencies.ai,
        embeddings: dependencies.embeddings,
        products: dependencies.products,
      });
    },
  };
}

export type DemoSeedDependencies = {
  store: DemoSeedStore;
  application: DemoSeedApplication;
};

export type DemoSeedResult = {
  productsInserted: number;
  productsUpdated: number;
  signalsProcessed: number;
  competitorsExtracted: number;
};

export async function seedDemoData(
  input: DemoSeedData,
  dependencies: DemoSeedDependencies,
): Promise<DemoSeedResult> {
  const data = DemoSeedDataSchema.parse(input);
  await dependencies.store.upsertCategory("running_shoes", "Running shoes");
  await dependencies.store.upsertFeatureDefinitions(
    "running_shoes",
    data.featureDefinitions,
  );

  const normalizedProducts = new JsonCatalogAdapter().parse(
    JSON.stringify(data.products),
  );
  const productResult = await dependencies.store.upsertProducts(
    normalizedProducts,
  );
  await dependencies.application.importMarketSignals(data.marketSignals);

  const competitors = productResult.products.filter(
    (product) => product.externalId !== "cloudrun-pro",
  );
  for (const competitor of competitors) {
    await dependencies.application.extractProduct(competitor.id);
  }

  return {
    productsInserted: productResult.inserted,
    productsUpdated: productResult.updated,
    signalsProcessed: data.marketSignals.length,
    competitorsExtracted: competitors.length,
  };
}

const StoredProductSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string().min(1),
});

export class SupabaseDemoSeedStore implements DemoSeedStore {
  constructor(
    private readonly client: ReturnType<typeof createClient<Database>>,
  ) {}

  async upsertCategory(slug: string, name: string): Promise<void> {
    const { error } = await this.client
      .from("categories")
      .upsert({ slug, name }, { onConflict: "slug" });
    if (error) throw new Error("DEMO_SEED_CATEGORY_UPSERT_FAILED", { cause: error });
  }

  async upsertFeatureDefinitions(
    category: string,
    definitions: FeatureDefinition[],
  ): Promise<void> {
    const rows = definitions.map((definition) => ({
      category_slug: category,
      feature_key: definition.key,
      label: definition.label,
      data_type: definition.dataType,
      unit: definition.unit,
      required: definition.required,
      demand_weight: definition.demandWeight,
      constraint_importance: definition.constraintImportance,
      competitive_coverage: definition.competitiveCoverage,
      competitive_direction: definition.competitiveDirection,
      answerability: definition.answerability,
      evidence_required: definition.evidenceRequired,
      synonyms: definition.synonyms,
    }));
    const { error } = await this.client.from("feature_definitions").upsert(rows, {
      onConflict: "category_slug,feature_key",
    });
    if (error) {
      throw new Error("DEMO_SEED_FEATURES_UPSERT_FAILED", { cause: error });
    }
  }

  async upsertProducts(products: RawProductInput[]): Promise<ProductUpsertResult> {
    const externalIds = products.flatMap((product) =>
      product.externalId ? [product.externalId] : [],
    );
    if (externalIds.length !== products.length) {
      throw new Error("DEMO_SEED_PRODUCT_EXTERNAL_ID_REQUIRED");
    }
    const { data: existingRows, error: existingError } = await this.client
      .from("products")
      .select("id,external_id")
      .in("external_id", externalIds);
    if (existingError) {
      throw new Error("DEMO_SEED_PRODUCT_LOOKUP_FAILED", {
        cause: existingError,
      });
    }
    const existing = StoredProductSchema.array().parse(existingRows ?? []);
    const existingIds = new Set(existing.map((row) => row.external_id));
    const rows = products.map((product) => ({
      external_id: product.externalId,
      name: product.name,
      category_slug: product.category,
      raw_listing: product.rawListing,
      price: product.price,
      currency: product.currency,
      source_type: product.sourceType,
      passport: null,
      original_passport: null,
      evaluation: null,
      embedding: null,
    }));
    const { data: upsertedRows, error } = await this.client
      .from("products")
      .upsert(rows, { onConflict: "external_id" })
      .select("id,external_id");
    if (error) {
      throw new Error("DEMO_SEED_PRODUCT_UPSERT_FAILED", { cause: error });
    }
    const upserted = StoredProductSchema.array().parse(upsertedRows ?? []);
    return {
      inserted: externalIds.filter((id) => !existingIds.has(id)).length,
      updated: externalIds.filter((id) => existingIds.has(id)).length,
      products: upserted.map((row) => ({
        id: row.id,
        externalId: row.external_id,
      })),
    };
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadDemoSeedData(
  dataDirectory = resolve(process.cwd(), "src/data"),
): Promise<DemoSeedData> {
  const [products, queries, marketSignals, featureDefinitions] =
    await Promise.all([
      readJson(resolve(dataDirectory, "demo-products.json")),
      readJson(resolve(dataDirectory, "demo-queries.json")),
      readJson(resolve(dataDirectory, "demo-market-signals.json")),
      readJson(resolve(dataDirectory, "running-shoes-category.json")),
    ]);
  return DemoSeedDataSchema.parse({
    products,
    queries,
    marketSignals,
    featureDefinitions,
  });
}

async function main(): Promise<void> {
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: resolve(process.cwd(), ".env") });
  const environment = parseEnv(process.env);
  const dependencies = getApplicationDependencies();
  const application = createDemoSeedApplication(dependencies);
  const client = createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const data = await loadDemoSeedData();
  const result = await seedDemoData(data, {
    store: new SupabaseDemoSeedStore(client),
    application,
  });
  console.log(
    `Demo seed complete: ${result.productsInserted} inserted, ${result.productsUpdated} updated, ${result.signalsProcessed} signals, ${result.competitorsExtracted} competitors extracted.`,
  );
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entryPath === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
