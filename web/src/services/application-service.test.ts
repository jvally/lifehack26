import { describe, expect, it } from "vitest";
import type { MarketSignal } from "@/domain/market";
import { FakeAiGateway } from "./ai-gateway";
import { analyzeProduct } from "./application-service";
import { FakeEmbeddingService } from "./embeddings";
import {
  InMemoryMarketRepository,
  InMemoryProductRepository,
} from "./repositories/in-memory";

describe("analyzeProduct", () => {
  it("extracts, evaluates, and persists a weak listing", async () => {
    const products = new InMemoryProductRepository();
    const market = new InMemoryMarketRepository();
    const embeddings = new FakeEmbeddingService();
    const product = await products.create({
      externalId: "cloudrun-pro",
      name: "CloudRun Pro",
      category: "running_shoes",
      rawListing: "A comfortable running shoe.",
      price: 179,
      currency: "SGD",
      sourceType: "text",
    });
    const signals: MarketSignal[] = [
      {
        id: "humid-half-marathon",
        category: "running_shoes",
        signalType: "user_query",
        rawText: "lightweight running shoes for humid weather",
        parsedIntent: {
          category: "running_shoes",
          goal: "half marathon training",
          hardConstraints: { weight: 230 },
          preferences: ["breathability"],
          contexts: ["humid weather"],
        },
        featureKeys: ["weight", "breathability"],
        featureValues: {},
        frequency: 38,
        sourceLabel: "Demo query set",
        sourceUrl: null,
        observedAt: "2026-08-29T00:00:00.000Z",
      },
      {
        id: "competitor-weight",
        category: "running_shoes",
        signalType: "competitor_observation",
        rawText: "Competitor weighs 240 g",
        parsedIntent: null,
        featureKeys: ["weight", "price"],
        featureValues: { weight: 240, price: 189 },
        frequency: 1,
        sourceLabel: "Curated demo catalog",
        sourceUrl: null,
        observedAt: "2026-08-29T00:00:00.000Z",
      },
    ];
    await market.saveSignals(
      signals,
      await embeddings.embed(signals.map((signal) => signal.rawText)),
    );
    const ai = new FakeAiGateway({
      async extractProduct() {
        return {
          name: "CloudRun Pro",
          category: "running_shoes",
          description: "A comfortable running shoe.",
          price: 179,
          currency: "SGD",
          features: [],
          useCases: ["running"],
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

    const result = await analyzeProduct(
      product.id,
      { ai, embeddings, products, market },
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(result.passport.productId).toBe(product.id);
    expect(result.evaluation.gaps[0].featureKey).toBe("weight");
    expect(result.intelligence.category).toBe("running_shoes");
    expect((await products.get(product.id))?.evaluation).toEqual(
      result.evaluation,
    );
  });
});
