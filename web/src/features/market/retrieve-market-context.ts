import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingService,
} from "@/services/embeddings";

import type { MarketRepository } from "./contracts";

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
      (feature) => `${feature.key} ${String(feature.value ?? "")}`,
    ),
  ].join(" ");
  const [embedding] = await dependencies.embeddings.embed([query]);
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
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
