import { ProductPassportSchema, type ProductPassport } from "@/domain/passport";
import type {
  AiGateway,
  RawProductInput as AiRawProductInput,
} from "@/services/ai-gateway";
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingService,
} from "@/services/embeddings";
import type { RawProductInput } from "@/services/repositories/contracts";
import { loadCategoryFeatureDefinitions } from "@/data/category-definitions";
import { preserveExplicitListingFacts } from "./explicit-listing-facts";

export type ExtractableProduct = Omit<RawProductInput, "externalId"> & {
  id: string;
  externalId?: string | null;
};

export interface ProductExtractionRepository {
  savePassport(productId: string, passport: ProductPassport): Promise<void>;
  saveEmbedding(productId: string, embedding: number[]): Promise<void>;
}

export function passportToSearchText(passport: ProductPassport): string {
  return [
    passport.name,
    passport.category,
    passport.description,
    ...passport.features.flatMap((feature) => [
      feature.key,
      feature.label,
      String(feature.value ?? ""),
      feature.unit ?? "",
    ]),
    ...passport.useCases,
    ...passport.suitableContexts,
    ...passport.limitations,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function extractProductPassport(
  product: ExtractableProduct,
  dependencies: {
    ai: AiGateway;
    embeddings: EmbeddingService;
    products: ProductExtractionRepository;
  },
  now: Date = new Date(),
): Promise<ProductPassport> {
  const aiInput: AiRawProductInput = {
    name: product.name,
    category: product.category,
    rawListing: product.rawListing,
    price: product.price,
    currency: product.currency,
    ...(product.externalId == null ? {} : { externalId: product.externalId }),
    ...(product.sourceType === "challenge_database"
      ? {}
      : { sourceType: product.sourceType }),
  };
  const draft = await dependencies.ai.extractProduct(aiInput);
  const passport = preserveExplicitListingFacts(ProductPassportSchema.parse({
    ...draft,
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price ?? draft.price,
    currency: product.currency ?? draft.currency,
    updatedAt: now.toISOString(),
  }), loadCategoryFeatureDefinitions(product.category), product.rawListing);
  const [embedding] = await dependencies.embeddings.embed([
    passportToSearchText(passport),
  ]);
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("PRODUCT_EMBEDDING_INVALID_LENGTH");
  }
  await dependencies.products.savePassport(product.id, passport);
  await dependencies.products.saveEmbedding(product.id, embedding);
  return passport;
}
