import type { MarketSignal } from "@/domain/market";

export interface MarketRepository {
  saveSignals(signals: MarketSignal[], embeddings: number[][]): Promise<void>;
  retrieve(
    category: string,
    lexicalQuery: string,
    embedding: number[],
    limit: number,
  ): Promise<MarketSignal[]>;
}

type StoredSignal = { signal: MarketSignal; embedding: number[] };

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  return leftMagnitude && rightMagnitude
    ? dot / Math.sqrt(leftMagnitude * rightMagnitude)
    : 0;
}

function lexicalSimilarity(query: string, signal: MarketSignal): number {
  const queryTokens = new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  if (queryTokens.size === 0) return 0;
  const text = [signal.rawText, ...signal.featureKeys].join(" ").toLowerCase();
  const matches = [...queryTokens].filter((token) => text.includes(token)).length;
  return matches / queryTokens.size;
}

/** In-memory category-filtered hybrid retrieval for network-free tests. */
export class InMemoryMarketRepository implements MarketRepository {
  private stored: StoredSignal[] = [];

  async saveSignals(signals: MarketSignal[], embeddings: number[][]) {
    if (signals.length !== embeddings.length) {
      throw new Error("MARKET_SIGNAL_EMBEDDING_MISMATCH");
    }
    this.stored = signals.map((signal, index) => ({
      signal: structuredClone(signal),
      embedding: [...embeddings[index]],
    }));
  }

  async retrieve(
    category: string,
    lexicalQuery: string,
    embedding: number[],
    limit: number,
  ) {
    return this.stored
      .filter(({ signal }) => signal.category === category)
      .map(({ signal, embedding: candidateEmbedding }) => ({
        signal,
        score:
          cosineSimilarity(embedding, candidateEmbedding) * 0.7 +
          lexicalSimilarity(lexicalQuery, signal) * 0.3,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(0, limit))
      .map(({ signal }) => structuredClone(signal));
  }
}
