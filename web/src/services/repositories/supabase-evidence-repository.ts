import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  EvidenceRecord,
  EvidenceRepository,
} from "./contracts";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

const EvidenceRowSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  feature_key: z.string().min(1),
  original_name: z.string().nullable(),
  media_type: z.string().min(1),
  storage_path: z.string().nullable(),
  extracted_text: z.string(),
  supported: z.boolean(),
  supporting_excerpt: z.string().nullable(),
  created_at: z.string(),
});

function mapEvidenceRow(input: unknown): EvidenceRecord {
  const row = EvidenceRowSchema.parse(input);
  return {
    id: row.id,
    productId: row.product_id,
    featureKey: row.feature_key,
    originalName: row.original_name,
    mediaType: row.media_type,
    storagePath: row.storage_path,
    extractedText: row.extracted_text,
    supported: row.supported,
    supportingExcerpt: row.supporting_excerpt,
    createdAt: row.created_at,
  };
}

function evidenceInsert(
  input: Omit<EvidenceRecord, "id" | "createdAt">,
) {
  return {
    product_id: input.productId,
    feature_key: input.featureKey,
    original_name: input.originalName,
    media_type: input.mediaType,
    storage_path: input.storagePath,
    extracted_text: input.extractedText,
    supported: input.supported,
    supporting_excerpt: input.supportingExcerpt,
  };
}

export class SupabaseEvidenceRepository implements EvidenceRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdmin()) {}

  async create(
    input: Omit<EvidenceRecord, "id" | "createdAt">,
  ): Promise<EvidenceRecord> {
    const { data, error } = await this.client
      .from("evidence_records")
      .insert(evidenceInsert(input))
      .select("*")
      .single();
    if (error) {
      if (error.code === "23503") throw new Error("PRODUCT_NOT_FOUND");
      throw new Error("EVIDENCE_REPOSITORY_CREATE_FAILED", { cause: error });
    }
    return mapEvidenceRow(data);
  }

  async listForProduct(productId: string): Promise<EvidenceRecord[]> {
    const { data, error } = await this.client
      .from("evidence_records")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error("EVIDENCE_REPOSITORY_LIST_FAILED", { cause: error });
    }
    return EvidenceRowSchema.array().parse(data ?? []).map(mapEvidenceRow);
  }
}
