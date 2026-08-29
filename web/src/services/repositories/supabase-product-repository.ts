import { z } from "zod";
import {
  ListingEvaluationSchema,
  type ListingEvaluation,
} from "@/domain/evaluation";
import {
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  ProductRecord,
  ProductRepository,
  RawProductInput,
} from "./contracts";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

const ProductRowSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string().nullable(),
  name: z.string().min(1),
  category_slug: z.string().min(1),
  raw_listing: z.string(),
  price: z.union([z.number(), z.string()]).nullable(),
  currency: z.string().nullable(),
  source_type: z.enum(["text", "json", "csv", "challenge_database"]),
  passport: z.unknown().nullable(),
  original_passport: z.unknown().nullable(),
  evaluation: z.unknown().nullable(),
  embedding: z.union([z.array(z.number()), z.string()]).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const MatchRowSchema = ProductRowSchema.extend({ similarity: z.number() });

function parseEmbedding(value: number[] | string | null): number[] | null {
  if (value === null) return null;
  if (Array.isArray(value)) return value;
  return z.array(z.number()).parse(JSON.parse(value));
}

function mapProductRow(input: unknown): ProductRecord {
  const row = ProductRowSchema.parse(input);
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    category: row.category_slug,
    rawListing: row.raw_listing,
    price: row.price === null ? null : Number(row.price),
    currency: row.currency,
    sourceType: row.source_type,
    passport:
      row.passport === null ? null : ProductPassportSchema.parse(row.passport),
    originalPassport:
      row.original_passport === null
        ? null
        : ProductPassportSchema.parse(row.original_passport),
    evaluation:
      row.evaluation === null
        ? null
        : ListingEvaluationSchema.parse(row.evaluation),
    embedding: parseEmbedding(row.embedding),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productInsert(input: RawProductInput) {
  return {
    external_id: input.externalId,
    name: input.name,
    category_slug: input.category,
    raw_listing: input.rawListing,
    price: input.price,
    currency: input.currency,
    source_type: input.sourceType,
  };
}

function serializeEmbedding(embedding: number[]): string {
  if (
    embedding.length !== 1536 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("PRODUCT_EMBEDDING_DIMENSION_INVALID");
  }
  return `[${embedding.join(",")}]`;
}

export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdmin()) {}

  async create(input: RawProductInput): Promise<ProductRecord> {
    const { data, error } = await this.client
      .from("products")
      .insert(productInsert(input))
      .select("*")
      .single();
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_CREATE_FAILED", { cause: error });
    }
    return mapProductRow(data);
  }

  async createMany(inputs: RawProductInput[]): Promise<ProductRecord[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await this.client.rpc("import_products", {
      input_products: inputs.map(productInsert),
    });
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_BATCH_CREATE_FAILED", {
        cause: error,
      });
    }
    return ProductRowSchema.array().parse(data ?? []).map(mapProductRow);
  }

  async get(productId: string): Promise<ProductRecord | null> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_GET_FAILED", { cause: error });
    }
    return data === null ? null : mapProductRow(data);
  }

  async list(limit = 100): Promise<ProductRecord[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_LIST_FAILED", { cause: error });
    }
    return z.array(ProductRowSchema).parse(data ?? []).map(mapProductRow);
  }

  async listByCategory(category: string): Promise<ProductRecord[]> {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("category_slug", category)
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_LIST_FAILED", { cause: error });
    }
    return z.array(ProductRowSchema).parse(data ?? []).map(mapProductRow);
  }

  async savePassport(
    productId: string,
    passport: ProductPassport,
  ): Promise<void> {
    const validated = ProductPassportSchema.parse(passport);
    const { error } = await this.client.rpc("save_product_passport", {
      input_product_id: productId,
      input_passport: validated,
    });
    if (error) {
      if (error.code === "P0002") throw new Error("PRODUCT_NOT_FOUND");
      throw new Error("PRODUCT_REPOSITORY_SAVE_PASSPORT_FAILED", {
        cause: error,
      });
    }
  }

  async saveEmbedding(productId: string, embedding: number[]): Promise<void> {
    const serializedEmbedding = serializeEmbedding(embedding);
    const { data, error } = await this.client
      .from("products")
      .update({ embedding: serializedEmbedding })
      .eq("id", productId)
      .select("id")
      .maybeSingle();
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_SAVE_EMBEDDING_FAILED", {
        cause: error,
      });
    }
    if (data === null) throw new Error("PRODUCT_NOT_FOUND");
  }

  async searchByEmbedding(
    category: string,
    embedding: number[],
    limit: number,
  ): Promise<Array<ProductRecord & { similarity: number }>> {
    const serializedEmbedding = serializeEmbedding(embedding);
    const { data, error } = await this.client.rpc("match_products_with_rows", {
      query_category: category,
      query_embedding: serializedEmbedding,
      result_limit: limit,
    });
    if (error) {
      throw new Error("PRODUCT_REPOSITORY_SEARCH_FAILED", { cause: error });
    }
    return MatchRowSchema.array().parse(data ?? []).map((match) => ({
      ...mapProductRow(match),
      similarity: match.similarity,
    }));
  }

  async saveEvaluation(
    productId: string,
    evaluation: ListingEvaluation,
  ): Promise<void> {
    const validated = ListingEvaluationSchema.parse(evaluation);
    const { error } = await this.client.rpc("save_product_evaluation", {
      input_product_id: productId,
      input_evaluation: validated,
    });
    if (error) {
      if (error.code === "P0002") throw new Error("PRODUCT_NOT_FOUND");
      throw new Error("PRODUCT_REPOSITORY_SAVE_EVALUATION_FAILED", {
        cause: error,
      });
    }
  }
}
