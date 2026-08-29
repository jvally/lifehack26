import { ProductPassportSchema, type ProductPassport } from "@/domain/passport";
import type { AiGateway, RawProductInput } from "@/services/ai-gateway";
import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingService,
} from "@/services/embeddings";

export type ExtractableProduct = RawProductInput & { id: string };

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
  const draft = await dependencies.ai.extractProduct(product);
  const passport = ProductPassportSchema.parse({
    ...draft,
    productId: product.id,
    name: product.name,
    category: product.category,
    price: product.price ?? draft.price,
    currency: product.currency ?? draft.currency,
    updatedAt: now.toISOString(),
  });
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
