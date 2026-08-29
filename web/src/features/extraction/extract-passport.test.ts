import { describe, expect, it } from "vitest";

import { FakeAiGateway } from "@/services/ai-gateway";
import { FakeEmbeddingService } from "@/services/embeddings";

import {
  extractProductPassport,
  type ProductExtractionRepository,
} from "./extract-passport";

describe("extractProductPassport", () => {
  it("validates and stores a grounded passport and 1536-dimensional embedding", async () => {
    let savedProductId = "";
    let savedEmbedding: number[] = [];
    const products: ProductExtractionRepository = {
      async savePassport(productId, passport) {
        savedProductId = productId;
        expect(passport.name).toBe("CloudRun Pro");
      },
      async saveEmbedding(productId, embedding) {
        expect(productId).toBe(savedProductId);
        savedEmbedding = embedding;
      },
    };
    const ai = new FakeAiGateway({
      async extractProduct() {
        return {
          name: "CloudRun Pro",
          category: "running_shoes",
          description: "Lightweight road running shoe",
          price: 199,
          currency: "SGD",
          features: [],
          useCases: ["running"],
          suitableContexts: ["road"],
          limitations: [],
        };
      },
      async parseQuery() {
        throw new Error("unused");
      },
      async verifyEvidence() {
        throw new Error("unused");
      },
    });

    const result = await extractProductPassport(
      {
        id: "product-cloudrun",
        name: "CloudRun Pro",
        category: "running_shoes",
        rawListing: "Lightweight shoe. S$179.",
        price: 179,
        currency: "SGD",
        sourceType: "text",
      },
      { ai, embeddings: new FakeEmbeddingService(), products },
      new Date("2026-08-29T00:00:00.000Z"),
    );

    expect(result.productId).toBe("product-cloudrun");
    expect(result.price).toBe(179);
    expect(savedProductId).toBe("product-cloudrun");
    expect(savedEmbedding).toHaveLength(1536);
  });
});
