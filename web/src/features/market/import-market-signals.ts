import { MarketSignalSchema, type MarketSignal } from "@/domain/market";
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingService,
} from "@/services/embeddings";

import type { MarketRepository } from "./contracts";

export async function importMarketSignals(
  rawSignals: unknown[],
  dependencies: {
    embeddings: EmbeddingService;
    market: MarketRepository;
  },
): Promise<MarketSignal[]> {
  const signals = rawSignals.map((signal) => MarketSignalSchema.parse(signal));
  const embeddings = await dependencies.embeddings.embed(
    signals.map((signal) =>
      [
        signal.rawText,
        ...signal.featureKeys,
        ...Object.entries(signal.featureValues).map(
          ([key, value]) => `${key} ${String(value)}`,
        ),
      ].join(" "),
    ),
  );
  if (
    embeddings.length !== signals.length ||
    embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSIONS)
  ) {
    throw new Error("MARKET_SIGNAL_EMBEDDING_MISMATCH");
  }
  await dependencies.market.saveSignals(signals, embeddings);
  return signals;
}
