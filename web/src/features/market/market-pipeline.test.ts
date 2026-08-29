import { describe, expect, it } from "vitest";

import rawSignals from "@/data/demo-market-signals.json";
import { MarketSignalSchema } from "@/domain/market";
import { makePassport } from "@/test/fixtures";
import { FakeEmbeddingService } from "@/services/embeddings";

import { InMemoryMarketRepository } from "./contracts";
import { importMarketSignals } from "./import-market-signals";
import { retrieveMarketContext } from "./retrieve-market-context";

describe("market intelligence pipeline", () => {
  it("imports aligned embeddings and retrieves only the requested category", async () => {
    const embeddings = new FakeEmbeddingService();
    const market = new InMemoryMarketRepository();
    const imported = await importMarketSignals(rawSignals, { embeddings, market });
    expect(imported).toHaveLength(4);
    expect(imported.every((signal) => MarketSignalSchema.safeParse(signal).success)).toBe(true);

    const retrieved = await retrieveMarketContext(
      makePassport({ description: "Breathable lightweight road shoe" }),
      { embeddings, market },
      3,
    );
    expect(retrieved).toHaveLength(3);
    expect(retrieved.every((signal) => signal.category === "running_shoes")).toBe(true);
    expect(retrieved.some((signal) => signal.id === "query-humid-half-marathon")).toBe(true);
  });
});
