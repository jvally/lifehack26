import { z } from "zod";
import {
  MarketSignalSchema,
  QueryIntentSchema,
  type MarketSignal,
} from "@/domain/market";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MarketRepository } from "./contracts";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

const MarketSearchRowSchema = z.object({
  id: z.string().min(1),
  category_slug: z.string().min(1),
  signal_type: z.enum(["user_query", "competitor_observation"]),
  raw_text: z.string().min(1),
  parsed_intent: z.unknown().nullable(),
  feature_keys: z.array(z.string()),
  feature_values: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
  frequency: z.number().nonnegative(),
  source_label: z.string().min(1),
  source_url: z.string().nullable(),
  observed_at: z.string(),
  score: z.number().optional(),
});

function serializeEmbedding(embedding: number[]): string {
  if (
    embedding.length !== 1536 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("MARKET_EMBEDDING_DIMENSION_INVALID");
  }
  return `[${embedding.join(",")}]`;
}

function signalRow(signal: MarketSignal, embedding: string) {
  return {
    id: signal.id,
    category_slug: signal.category,
    signal_type: signal.signalType,
    raw_text: signal.rawText,
    parsed_intent: signal.parsedIntent,
    feature_keys: signal.featureKeys,
    feature_values: signal.featureValues,
    frequency: signal.frequency,
    source_label: signal.sourceLabel,
    source_url: signal.sourceUrl,
    observed_at: signal.observedAt,
    embedding,
  };
}

function mapSignal(input: unknown): MarketSignal {
  const row = MarketSearchRowSchema.parse(input);
  const observedAt = new Date(row.observed_at);
  if (Number.isNaN(observedAt.getTime())) {
    throw new Error("MARKET_SIGNAL_DATE_INVALID");
  }
  return MarketSignalSchema.parse({
    id: row.id,
    category: row.category_slug,
    signalType: row.signal_type,
    rawText: row.raw_text,
    parsedIntent:
      row.parsed_intent === null
        ? null
        : QueryIntentSchema.parse(row.parsed_intent),
    featureKeys: row.feature_keys,
    featureValues: row.feature_values,
    frequency: row.frequency,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    observedAt: observedAt.toISOString(),
  });
}

export class SupabaseMarketRepository implements MarketRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdmin()) {}

  async saveSignals(
    signals: MarketSignal[],
    embeddings: number[][],
  ): Promise<void> {
    if (signals.length !== embeddings.length) {
      throw new Error("MARKET_SIGNAL_EMBEDDING_COUNT_MISMATCH");
    }
    const rows = signals.map((signal, index) => {
      const validated = MarketSignalSchema.parse(signal);
      const serializedEmbedding = serializeEmbedding(embeddings[index]);
      return signalRow(validated, serializedEmbedding);
    });
    const { error } = await this.client
      .from("market_signals")
      .upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error("MARKET_REPOSITORY_SAVE_FAILED", { cause: error });
    }
  }

  async retrieve(
    category: string,
    query: string,
    embedding: number[],
    limit: number,
  ): Promise<MarketSignal[]> {
    const serializedEmbedding = serializeEmbedding(embedding);
    const { data, error } = await this.client.rpc("hybrid_market_search", {
      query_category: category,
      query_text: query,
      query_embedding: serializedEmbedding,
      result_limit: limit,
    });
    if (error) {
      throw new Error("MARKET_REPOSITORY_RETRIEVE_FAILED", { cause: error });
    }
    return z.array(MarketSearchRowSchema).parse(data ?? []).map(mapSignal);
  }
}
