import type { EmbeddingService } from "@/services/embeddings";
import type { AiGateway } from "@/services/ai-gateway";
import type { ProductRepository } from "@/services/repositories/contracts";
import { parseBuyerQuery } from "./parse-query";
import { rankProducts } from "./rank-products";

export async function simulateRecommendation(
  productId: string,
  query: string,
  dependencies: {
    ai: AiGateway;
    embeddings: EmbeddingService;
    products: ProductRepository;
  },
) {
  const target = await dependencies.products.get(productId);
  if (!target?.passport || !target.originalPassport) {
    throw new Error("SIMULATION_PRODUCT_NOT_READY");
  }
  const intent = await parseBuyerQuery(query, dependencies.ai);
  const [embedding] = await dependencies.embeddings.embed([query]);
  if (!embedding || embedding.length !== 1536) {
    throw new Error("SIMULATION_EMBEDDING_INVALID");
  }
  const semanticCandidates = await dependencies.products.searchByEmbedding(
    intent.category,
    embedding,
    20,
  );
  const candidates = semanticCandidates.map((candidate) => ({
    passport: candidate.passport,
    similarity: candidate.similarity,
  })).filter(
    (candidate): candidate is {
      passport: NonNullable<typeof candidate.passport>;
      similarity: number;
    } => candidate.passport !== null,
  );
  const targetSimilarity =
    semanticCandidates.find((candidate) => candidate.id === productId)
      ?.similarity ?? 0.5;
  const competitors = candidates.filter(
    (candidate) => candidate.passport.productId !== productId,
  );
  const before = rankProducts(query, intent, [
    ...competitors,
    { passport: target.originalPassport, similarity: targetSimilarity },
  ]);
  const after = rankProducts(query, intent, [
    ...competitors,
    { passport: target.passport, similarity: targetSimilarity },
  ]);
  return { intent, before, after };
}