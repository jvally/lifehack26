import type { EmbeddingService } from "@/services/embeddings";
import type { AiGateway } from "@/services/ai-gateway";
import type { ProductRepository } from "@/services/repositories/contracts";
import { getQueryArtifacts } from "./query-artifacts";
import { rankProducts } from "./rank-products";
import { getPreferenceProfile } from "@/domain/preference-profile";
import type { AttributionRepository } from "@/services/repositories/contracts";
import type { AttributionSource } from "@/domain/attribution";

export async function simulateRecommendation(
  productId: string,
  query: string,
  dependencies: {
    ai: AiGateway;
    embeddings: EmbeddingService;
    products: ProductRepository;
    attribution: AttributionRepository;
  },
  options: {
    profileId?: string | null;
    source?: AttributionSource;
  } = {},
) {
  const target = await dependencies.products.get(productId);
  if (!target?.passport || !target.originalPassport) {
    throw new Error("SIMULATION_PRODUCT_NOT_READY");
  }
  const { intent: parsedIntent, embedding } = await getQueryArtifacts(query, dependencies);
  const profile = getPreferenceProfile(options.profileId);
  const intent = {
    ...parsedIntent,
    preferences: [...new Set([...parsedIntent.preferences, ...profile.preferences])],
  };
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
  const attribution = await dependencies.attribution.create({
    productId,
    source: options.source ?? "retail_ready_simulator",
    eventType: "recommendation_served",
    referralToken: crypto.randomUUID(),
    query,
  });
  return { intent, before, after, profile, attribution };
}
