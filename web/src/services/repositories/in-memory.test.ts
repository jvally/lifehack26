import { describe, expect, it } from "vitest";
import type { ListingEvaluation } from "@/domain/evaluation";
import type { MarketSignal } from "@/domain/market";
import { makePassport } from "@/test/fixtures";
import {
  InMemoryEvidenceRepository,
  InMemoryMarketRepository,
  InMemoryProductRepository,
  InMemorySessionRepository,
} from "./in-memory";

const productInput = {
  externalId: "cloudrun",
  name: "CloudRun Pro",
  category: "running_shoes",
  rawListing: "Lightweight running shoe",
  price: 179,
  currency: "SGD",
  sourceType: "text" as const,
};

const evaluation: ListingEvaluation = {
  readiness: {
    completeness: 10,
    intentCoverage: 20,
    evidenceQuality: 30,
    discoverability: 40,
    consistency: 100,
    total: 34.5,
  },
  competitiveness: {
    peerFeatureCoverage: 10,
    differentiation: 20,
    relativeSpecifications: 30,
    priceFit: 40,
    highDemandQueryCoverage: 50,
    total: 26.5,
  },
  gaps: [],
  coveredIntentIds: [],
  generatedAt: "2026-08-29T00:00:00.000Z",
  scoringVersion: "1.0.0",
};

const marketSignal: MarketSignal = {
  id: "signal-humid-running",
  category: "running_shoes",
  signalType: "user_query",
  rawText: "running shoes for humid weather",
  parsedIntent: null,
  featureKeys: ["breathability"],
  featureValues: {},
  frequency: 38,
  sourceLabel: "Demo query set",
  sourceUrl: null,
  observedAt: "2026-08-29T00:00:00.000Z",
};

describe("InMemoryProductRepository", () => {
  it("creates and retrieves a product without sharing mutable state", async () => {
    const repository = new InMemoryProductRepository();
    const created = await repository.create(productInput);

    const loaded = await repository.get(created.id);
    expect(loaded?.name).toBe("CloudRun Pro");
    loaded!.name = "Changed outside repository";

    expect((await repository.get(created.id))?.name).toBe("CloudRun Pro");
  });

  it("lists only products from the requested category", async () => {
    const repository = new InMemoryProductRepository();
    await repository.create(productInput);
    await repository.create({
      ...productInput,
      externalId: "trail-product",
      category: "trail_gear",
    });

    const products = await repository.listByCategory("running_shoes");

    expect(products).toHaveLength(1);
    expect(products[0].category).toBe("running_shoes");
  });

  it("preserves the original passport on later passport saves", async () => {
    const repository = new InMemoryProductRepository();
    const product = await repository.create(productInput);
    const original = makePassport({ productId: product.id, description: "Original" });
    const updated = makePassport({ productId: product.id, description: "Updated" });

    await repository.savePassport(product.id, original);
    await repository.savePassport(product.id, updated);

    const loaded = await repository.get(product.id);
    expect(loaded?.passport?.description).toBe("Updated");
    expect(loaded?.originalPassport?.description).toBe("Original");
  });

  it("requires 1536-dimensional embeddings", async () => {
    const repository = new InMemoryProductRepository();
    const product = await repository.create(productInput);

    await expect(repository.saveEmbedding(product.id, [0.1])).rejects.toThrow(
      "PRODUCT_EMBEDDING_DIMENSION_INVALID",
    );
  });

  it("rejects non-finite product embeddings", async () => {
    const repository = new InMemoryProductRepository();
    const product = await repository.create(productInput);
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    embedding[0] = Number.NaN;

    await expect(repository.saveEmbedding(product.id, embedding)).rejects.toThrow(
      "PRODUCT_EMBEDDING_DIMENSION_INVALID",
    );
  });

  it("stores evaluations and returns category-scoped embedding results", async () => {
    const repository = new InMemoryProductRepository();
    const product = await repository.create(productInput);
    const embedding = Array.from({ length: 1536 }, () => 0.1);

    await repository.saveEmbedding(product.id, embedding);
    await repository.saveEvaluation(product.id, evaluation);
    const results = await repository.searchByEmbedding(
      "running_shoes",
      embedding,
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBe(0.5);
    expect((await repository.get(product.id))?.evaluation).toEqual(evaluation);
  });
});

describe("InMemoryMarketRepository", () => {
  it("uses the market validation contract for invalid embeddings", async () => {
    const repository = new InMemoryMarketRepository();

    await expect(repository.saveSignals([marketSignal], [[0.1]])).rejects.toThrow(
      "MARKET_EMBEDDING_DIMENSION_INVALID",
    );
  });

  it("stores aligned signals and returns only the requested category", async () => {
    const repository = new InMemoryMarketRepository();
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    await repository.saveSignals(
      [marketSignal, { ...marketSignal, id: "other", category: "trail_gear" }],
      [embedding, embedding],
    );

    const signals = await repository.retrieve(
      "running_shoes",
      "humid",
      embedding,
      10,
    );

    expect(signals).toEqual([marketSignal]);
  });
});

describe("InMemorySessionRepository", () => {
  it("records asked features and cloned interview messages", async () => {
    const repository = new InMemorySessionRepository();
    const session = await repository.create("product-1");
    const message = {
      id: "message-1",
      role: "assistant" as const,
      content: "What is the measured weight?",
      featureKey: "weight",
      createdAt: "2026-08-29T00:00:00.000Z",
    };

    await repository.appendMessage(session.id, message);
    await repository.markAsked(session.id, "weight");
    message.content = "Changed outside repository";

    const loaded = await repository.get(session.id);
    expect(loaded?.askedFeatureKeys).toEqual(["weight"]);
    expect(loaded?.messages[0].content).toBe("What is the measured weight?");
  });
});

describe("InMemoryEvidenceRepository", () => {
  it("does not share mutable evidence state with callers", async () => {
    const repository = new InMemoryEvidenceRepository();
    const input = {
      productId: "product-1",
      featureKey: "weight",
      originalName: null,
      mediaType: "text/plain",
      storagePath: null,
      extractedText: "The shoe weighs 220 g.",
      supported: true,
      supportingExcerpt: "weighs 220 g",
    };

    const created = await repository.create(input);
    created.extractedText = "Changed outside repository";
    const firstRead = await repository.listForProduct("product-1");
    firstRead[0].extractedText = "Also changed outside repository";

    expect((await repository.listForProduct("product-1"))[0].extractedText).toBe(
      "The shoe weighs 220 g.",
    );
  });
});
