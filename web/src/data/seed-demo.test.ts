import { describe, expect, it, vi } from "vitest";
import type { MarketSignal } from "@/domain/market";
import { FakeAiGateway } from "@/services/ai-gateway";
import { FakeEmbeddingService } from "@/services/embeddings";
import type { RawProductInput } from "@/services/repositories/contracts";
import {
  InMemoryMarketRepository,
  InMemoryProductRepository,
} from "@/services/repositories/in-memory";
import {
  createDemoSeedApplication,
  DemoSeedDataSchema,
  loadDemoSeedData,
  seedDemoData,
  SupabaseDemoSeedStore,
  type DemoSeedStore,
} from "./seed-demo";

function makeSeedData() {
  const products = Array.from({ length: 10 }, (_, index) => ({
    id: index === 0 ? "cloudrun-pro" : `competitor-${index}`,
    name: index === 0 ? "CloudRun Pro" : `Competitor ${index}`,
    category: "running_shoes",
    description:
      index === 0
        ? "A lightweight and comfortable running shoe suitable for all runners."
        : `Structured competitor listing ${index}`,
    price: 170 + index,
    currency: "SGD",
  }));
  const queries = Array.from({ length: 20 }, (_, index) => ({
    id: `query-${index}`,
    query: `running shoe query number ${index}`,
    frequency: index + 1,
    featureKeys: ["weight"],
  }));
  const querySignals: MarketSignal[] = queries.map((query) => ({
    id: query.id,
    category: "running_shoes",
    signalType: "user_query",
    rawText: query.query,
    parsedIntent: null,
    featureKeys: query.featureKeys,
    featureValues: {},
    frequency: query.frequency,
    sourceLabel: "Demo query set",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  }));
  const competitorSignals: MarketSignal[] = products.slice(1).map((product) => ({
    id: `${product.id}-observation`,
    category: "running_shoes",
    signalType: "competitor_observation",
    rawText: product.description,
    parsedIntent: null,
    featureKeys: ["price"],
    featureValues: { price: product.price },
    frequency: 1,
    sourceLabel: "Curated demo catalog",
    sourceUrl: null,
    observedAt: "2026-08-29T00:00:00.000Z",
  }));
  return {
    products,
    queries,
    marketSignals: [...querySignals, ...competitorSignals],
    featureDefinitions: [
      {
        key: "weight",
        label: "Measured weight",
        dataType: "number" as const,
        unit: "g",
        required: true,
        demandWeight: 0.9,
        constraintImportance: 0.8,
        competitiveCoverage: 0.75,
        competitiveDirection: "lower" as const,
        answerability: 1,
        evidenceRequired: true,
        synonyms: ["lightweight", "grams"],
      },
    ],
  };
}

class FakeSeedStore implements DemoSeedStore {
  readonly productIds = new Map<string, string>();

  async upsertCategory() {}

  async upsertFeatureDefinitions() {}

  async upsertProducts(products: RawProductInput[]) {
    let inserted = 0;
    let updated = 0;
    for (const product of products) {
      const externalId = product.externalId!;
      if (this.productIds.has(externalId)) {
        updated += 1;
      } else {
        inserted += 1;
        this.productIds.set(externalId, `product-${this.productIds.size + 1}`);
      }
    }
    return {
      inserted,
      updated,
      products: products.map((product) => ({
        id: this.productIds.get(product.externalId!)!,
        externalId: product.externalId!,
      })),
    };
  }
}

describe("seedDemoData", () => {
  it("loads the checked-in demo files as a valid seed", async () => {
    const data = await loadDemoSeedData();
    const querySignalIds = new Set(
      data.marketSignals
        .filter((signal) => signal.signalType === "user_query")
        .map((signal) => signal.id),
    );

    expect(data.products).toHaveLength(22);
    expect(data.queries).toHaveLength(20);
    expect(data.marketSignals).toHaveLength(22);
    expect(data.featureDefinitions).toHaveLength(12);
    expect(data.queries.every((query) => querySignalIds.has(query.id))).toBe(
      true,
    );
    expect(new Set(data.products.map((product) => product.category)).size).toBe(7);
    expect(data.products[0]?.category).toBe("running_shoes");
  });

  it("is idempotent and preserves the weak CloudRun Pro passport", async () => {
    const store = new FakeSeedStore();
    const signals = new Map<string, MarketSignal>();
    const application = {
      importMarketSignals: vi.fn(async (items: MarketSignal[]) => {
        items.forEach((signal) => signals.set(signal.id, signal));
      }),
      extractProduct: vi.fn(async () => undefined),
    };
    const data = DemoSeedDataSchema.parse(makeSeedData());

    const first = await seedDemoData(data, { store, application });
    const second = await seedDemoData(data, { store, application });

    expect(first).toMatchObject({ productsInserted: 10, productsUpdated: 0 });
    expect(second).toMatchObject({ productsInserted: 0, productsUpdated: 10 });
    expect(store.productIds.size).toBe(10);
    expect(signals.size).toBe(29);
    expect(application.extractProduct).toHaveBeenCalledTimes(18);
    const cloudRunId = store.productIds.get("cloudrun-pro");
    expect(application.extractProduct).not.toHaveBeenCalledWith(cloudRunId);
  });

  it("rejects an undersized demo before writing", () => {
    expect(() =>
      DemoSeedDataSchema.parse({
        products: [],
        queries: [],
        marketSignals: [],
        featureDefinitions: [],
      }),
    ).toThrow();
  });

  it("composes integrated market import and passport extraction", async () => {
    const products = new InMemoryProductRepository();
    const market = new InMemoryMarketRepository();
    const embeddings = new FakeEmbeddingService();
    const product = await products.create({
      externalId: "competitor-1",
      name: "Competitor 1",
      category: "running_shoes",
      rawListing: "Structured competitor listing",
      price: 171,
      currency: "SGD",
      sourceType: "json",
    });
    const ai = new FakeAiGateway({
      async extractProduct() {
        return {
          name: "Competitor 1",
          category: "running_shoes",
          description: "Structured competitor listing",
          price: 171,
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
    });
    const application = createDemoSeedApplication({
      ai,
      embeddings,
      products,
      market,
    });
    const signal = DemoSeedDataSchema.parse(makeSeedData()).marketSignals[0];

    await application.importMarketSignals([signal]);
    await application.extractProduct(product.id);

    expect((await products.get(product.id))?.passport?.productId).toBe(product.id);
    const [queryEmbedding] = await embeddings.embed([signal.rawText]);
    await expect(
      market.retrieve("running_shoes", signal.rawText, queryEmbedding, 1),
    ).resolves.toEqual([signal]);
  });
});

describe("SupabaseDemoSeedStore", () => {
  it("resets generated product state before rebuilding the demo", async () => {
    const lookup = vi.fn().mockResolvedValue({ data: [], error: null });
    const lookupSelect = vi.fn(() => ({ in: lookup }));
    const upsertSelect = vi.fn().mockResolvedValue({
      data: [
        {
          id: "8d649ffc-9553-4e64-a3ae-1dba7ab65499",
          external_id: "cloudrun-pro",
        },
      ],
      error: null,
    });
    const upsert = vi.fn((rows: unknown) => {
      void rows;
      return { select: upsertSelect };
    });
    const client = {
      from: vi.fn(() => ({ select: lookupSelect, upsert })),
    };
    const store = new SupabaseDemoSeedStore(client as never);

    await store.upsertProducts([
      {
        externalId: "cloudrun-pro",
        name: "CloudRun Pro",
        category: "running_shoes",
        rawListing: "Intentionally weak listing",
        price: 179,
        currency: "SGD",
        sourceType: "json",
      },
    ]);

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          external_id: "cloudrun-pro",
          passport: null,
          original_passport: null,
          evaluation: null,
          embedding: null,
        }),
      ],
      { onConflict: "external_id" },
    );
  });
});
