import type { QueryIntent } from "@/domain/market";
import type { AiGateway } from "@/services/ai-gateway";
import type { EmbeddingService } from "@/services/embeddings";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: Promise<{ intent: QueryIntent; embedding: number[] }> }>();

export function getQueryArtifacts(
  query: string,
  dependencies: { ai: AiGateway; embeddings: EmbeddingService },
): Promise<{ intent: QueryIntent; embedding: number[] }> {
  const key = query.trim().toLowerCase();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = Promise.all([
    dependencies.ai.parseQuery(query),
    dependencies.embeddings.embed([query]),
  ]).then(([intent, embeddings]) => {
    const [embedding] = embeddings;
    if (!embedding || embedding.length !== 1536) {
      throw new Error("SIMULATION_EMBEDDING_INVALID");
    }
    return { intent, embedding };
  });
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, value });
  void value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}
