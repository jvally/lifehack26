import type { CategoryIntelligence } from "@/domain/market";
import { loadCategoryFeatureDefinitions } from "@/data/category-definitions";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { extractProductPassport } from "@/features/extraction/extract-passport";
import { buildCategoryIntelligence } from "@/features/market/build-category-intelligence";
import { retrieveMarketContext } from "@/features/market/retrieve-market-context";
import type { AiGateway } from "./ai-gateway";
import type { EmbeddingService } from "./embeddings";
import type {
  MarketRepository,
  ProductRepository,
} from "./repositories/contracts";

type AnalysisDependencies = {
  ai: AiGateway;
  embeddings: EmbeddingService;
  products: ProductRepository;
  market: MarketRepository;
};

export async function loadIntelligence(
  productId: string,
  dependencies: AnalysisDependencies,
): Promise<CategoryIntelligence> {
  const product = await dependencies.products.get(productId);
  if (!product?.passport) {
    throw new Error("PRODUCT_PASSPORT_NOT_FOUND");
  }
  const signals = await retrieveMarketContext(product.passport, {
    embeddings: dependencies.embeddings,
    market: dependencies.market,
  });
  const baseFeatures = loadCategoryFeatureDefinitions(product.passport.category);
  return buildCategoryIntelligence(
    product.passport.category,
    baseFeatures,
    signals,
  );
}

export async function analyzeProduct(
  productId: string,
  dependencies: AnalysisDependencies,
  now: Date = new Date(),
) {
  const product = await dependencies.products.get(productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  const passport = product.passport ?? await extractProductPassport(
    product,
    {
      ai: dependencies.ai,
      embeddings: dependencies.embeddings,
      products: dependencies.products,
    },
    now,
  );
  const intelligence = await loadIntelligence(productId, dependencies);
  const evaluation = evaluateListing(passport, intelligence, now);
  await dependencies.products.saveEvaluation(productId, evaluation);
  return { passport, evaluation, intelligence };
}
