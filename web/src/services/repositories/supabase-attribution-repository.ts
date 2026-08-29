import { AttributionEventSchema, type AttributionEvent } from "@/domain/attribution";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AttributionRepository } from "./contracts";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

function mapRecord(value: unknown): AttributionEvent {
  const row = value as Record<string, unknown>;
  return AttributionEventSchema.parse({
    id: row.id,
    productId: row.product_id,
    source: row.source,
    eventType: row.event_type,
    referralToken: row.referral_token,
    query: row.query,
    createdAt: row.created_at,
  });
}

export class SupabaseAttributionRepository implements AttributionRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdmin()) {}

  async create(input: Omit<AttributionEvent, "id" | "createdAt">): Promise<AttributionEvent> {
    const { data, error } = await this.client
      .from("attribution_events")
      .insert({
        product_id: input.productId,
        source: input.source,
        event_type: input.eventType,
        referral_token: input.referralToken,
        query: input.query,
      })
      .select("*")
      .single();
    if (error) throw new Error("ATTRIBUTION_EVENT_CREATE_FAILED", { cause: error });
    return mapRecord(data);
  }

  async listForProduct(productId: string): Promise<AttributionEvent[]> {
    const { data, error } = await this.client
      .from("attribution_events")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("ATTRIBUTION_EVENT_LIST_FAILED", { cause: error });
    return (data ?? []).map(mapRecord);
  }
}
