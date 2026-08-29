import { describe, expect, it, vi } from "vitest";
import type { ListingEvaluation } from "@/domain/evaluation";
import type { MarketSignal } from "@/domain/market";
import { SupabaseEvidenceRepository } from "./supabase-evidence-repository";
import { SupabaseMarketRepository } from "./supabase-market-repository";
import { SupabaseProductRepository } from "./supabase-product-repository";
import { SupabaseSessionRepository } from "./supabase-session-repository";

const productRow = {
  id: "8d649ffc-9553-4e64-a3ae-1dba7ab65499",
  external_id: "cloudrun",
  name: "CloudRun Pro",
  category_slug: "running_shoes",
  raw_listing: "Lightweight running shoe",
  price: 179,
  currency: "SGD",
  source_type: "text",
  passport: null,
  original_passport: null,
  evaluation: null,
  embedding: null,
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: "2026-08-29T00:00:00.000Z",
};

const marketSignal: MarketSignal = {
  id: "humid-query",
  category: "running_shoes",
  signalType: "user_query",
  rawText: "running shoes for humid weather",
  parsedIntent: null,
  featureKeys: ["breathability"],
  featureValues: {},
  frequency: 38,
  sourceLabel: "Demo query set",
  sourceUrl: null,
  observedAt: "2026-08-29T00:00:00.000Z",
};

const evaluation: ListingEvaluation = {
  readiness: {
    completeness: 70,
    intentCoverage: 65,
    evidenceQuality: 60,
    discoverability: 75,
    consistency: 80,
    total: 70,
  },
  competitiveness: {
    peerFeatureCoverage: 60,
    differentiation: 55,
    relativeSpecifications: 65,
    priceFit: 70,
    highDemandQueryCoverage: 50,
    total: 60,
  },
  gaps: [],
  coveredIntentIds: ["humid-half-marathon"],
  generatedAt: "2026-08-29T00:00:00.000Z",
  scoringVersion: "1.0.0",
};

describe("SupabaseProductRepository", () => {
  it("imports a product batch through one transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        productRow,
        {
          ...productRow,
          id: "b704ac7d-6877-4cf5-afec-b1d12c07f77a",
          external_id: "road-tempo",
        },
      ],
      error: null,
    });
    const repository = new SupabaseProductRepository({ rpc } as never);

    const created = await repository.createMany([
      {
        externalId: "cloudrun",
        name: "CloudRun Pro",
        category: "running_shoes",
        rawListing: "Lightweight running shoe",
        price: 179,
        currency: "SGD",
        sourceType: "csv",
      },
      {
        externalId: "road-tempo",
        name: "Road Tempo",
        category: "running_shoes",
        rawListing: "Tempo running shoe",
        price: 199,
        currency: "SGD",
        sourceType: "csv",
      },
    ]);

    expect(created).toHaveLength(2);
    expect(rpc).toHaveBeenCalledWith("import_products", {
      input_products: expect.arrayContaining([
        expect.objectContaining({ external_id: "cloudrun" }),
      ]),
    });
  });

  it("saves the first passport through the atomic database function", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: productRow.id, error: null });
    const repository = new SupabaseProductRepository({ rpc } as never);
    const passport = {
      productId: productRow.id,
      name: "CloudRun Pro",
      category: "running_shoes",
      description: "Lightweight running shoe",
      price: 179,
      currency: "SGD",
      features: [],
      useCases: [],
      suitableContexts: [],
      limitations: [],
      updatedAt: "2026-08-29T00:00:00.000Z",
    };

    await repository.savePassport(productRow.id, passport);

    expect(rpc).toHaveBeenCalledWith("save_product_passport", {
      input_product_id: productRow.id,
      input_passport: passport,
    });
  });

  it("preserves the product not-found repository contract", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "PRODUCT_NOT_FOUND" },
    });
    const repository = new SupabaseProductRepository({ rpc } as never);
    const passport = {
      productId: productRow.id,
      name: "CloudRun Pro",
      category: "running_shoes",
      description: "Lightweight running shoe",
      price: 179,
      currency: "SGD",
      features: [],
      useCases: [],
      suitableContexts: [],
      limitations: [],
      updatedAt: "2026-08-29T00:00:00.000Z",
    };

    await expect(repository.savePassport(productRow.id, passport)).rejects.toThrow(
      "PRODUCT_NOT_FOUND",
    );
  });

  it("serializes product embeddings for pgvector writes", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: productRow.id },
      error: null,
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn((input: unknown) => {
      void input;
      return { eq };
    });
    const client = { from: vi.fn(() => ({ update })) };
    const repository = new SupabaseProductRepository(client as never);
    const embedding = Array.from({ length: 1536 }, () => 0.1);

    await repository.saveEmbedding(productRow.id, embedding);

    const payload = update.mock.calls[0][0] as { embedding: unknown };
    expect(typeof payload.embedding).toBe("string");
    expect(JSON.parse(payload.embedding as string)).toEqual(embedding);
  });

  it("reports a missing product when an embedding update changes no row", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn((input: unknown) => {
      void input;
      return { eq };
    });
    const client = { from: vi.fn(() => ({ update })) };
    const repository = new SupabaseProductRepository(client as never);
    const embedding = Array.from({ length: 1536 }, () => 0.1);

    await expect(
      repository.saveEmbedding(productRow.id, embedding),
    ).rejects.toThrow("PRODUCT_NOT_FOUND");
  });

  it("saves an evaluation and its history through one transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: productRow.id, error: null });
    const repository = new SupabaseProductRepository({ rpc } as never);

    await repository.saveEvaluation(productRow.id, evaluation);

    expect(rpc).toHaveBeenCalledWith("save_product_evaluation", {
      input_product_id: productRow.id,
      input_evaluation: evaluation,
    });
  });

  it("reports a missing product when saving an evaluation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "PRODUCT_NOT_FOUND" },
    });
    const repository = new SupabaseProductRepository({ rpc } as never);

    await expect(
      repository.saveEvaluation(productRow.id, evaluation),
    ).rejects.toThrow("PRODUCT_NOT_FOUND");
  });

  it("maps a created database row to the repository contract", async () => {
    const single = vi.fn().mockResolvedValue({ data: productRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const client = { from: vi.fn(() => ({ insert })) };
    const repository = new SupabaseProductRepository(client as never);

    const created = await repository.create({
      externalId: "cloudrun",
      name: "CloudRun Pro",
      category: "running_shoes",
      rawListing: "Lightweight running shoe",
      price: 179,
      currency: "SGD",
      sourceType: "text",
    });

    expect(created).toMatchObject({
      id: productRow.id,
      externalId: "cloudrun",
      category: "running_shoes",
      createdAt: productRow.created_at,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ category_slug: "running_shoes" }),
    );
  });
});

describe("SupabaseMarketRepository", () => {
  it("upserts validated signals with aligned embeddings", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) };
    const repository = new SupabaseMarketRepository(client as never);
    const embedding = Array.from({ length: 1536 }, () => 0.1);

    await repository.saveSignals([marketSignal], [embedding]);

    const [rows, options] = upsert.mock.calls[0] as [
      Array<{ id: string; category_slug: string; embedding: unknown }>,
      { onConflict: string },
    ];
    expect(rows[0]).toMatchObject({
      id: marketSignal.id,
      category_slug: "running_shoes",
    });
    expect(typeof rows[0].embedding).toBe("string");
    expect(JSON.parse(rows[0].embedding as string)).toEqual(embedding);
    expect(options).toEqual({ onConflict: "id" });
  });

  it("maps hybrid search rows through the MarketSignal schema", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: marketSignal.id,
          category_slug: marketSignal.category,
          signal_type: marketSignal.signalType,
          raw_text: marketSignal.rawText,
          parsed_intent: null,
          feature_keys: marketSignal.featureKeys,
          feature_values: marketSignal.featureValues,
          frequency: marketSignal.frequency,
          source_label: marketSignal.sourceLabel,
          source_url: null,
          observed_at: marketSignal.observedAt,
          score: 0.03,
        },
      ],
      error: null,
    });
    const repository = new SupabaseMarketRepository({ rpc } as never);
    const embedding = Array.from({ length: 1536 }, () => 0.1);

    const signals = await repository.retrieve(
      "running_shoes",
      "humid",
      embedding,
      5,
    );

    expect(signals).toEqual([marketSignal]);
    const rpcArguments = rpc.mock.calls[0][1] as { query_embedding: unknown };
    expect(typeof rpcArguments.query_embedding).toBe("string");
    expect(JSON.parse(rpcArguments.query_embedding as string)).toEqual(
      embedding,
    );
  });
});

describe("SupabaseEvidenceRepository", () => {
  const evidenceRow = {
    id: "6a69abcc-4d4d-4528-b76d-1dcab3bc6815",
    product_id: productRow.id,
    feature_key: "weight",
    original_name: null,
    media_type: "text/plain",
    storage_path: null,
    extracted_text: "The shoe weighs 220 g.",
    supported: true,
    supporting_excerpt: "weighs 220 g",
    created_at: "2026-08-29T00:00:00.000Z",
  };

  it("creates and maps an evidence record", async () => {
    const single = vi.fn().mockResolvedValue({ data: evidenceRow, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn((input: unknown) => {
      void input;
      return { select };
    });
    const client = { from: vi.fn(() => ({ insert })) };
    const repository = new SupabaseEvidenceRepository(client as never);

    const created = await repository.create({
      productId: productRow.id,
      featureKey: "weight",
      originalName: null,
      mediaType: "text/plain",
      storagePath: null,
      extractedText: "The shoe weighs 220 g.",
      supported: true,
      supportingExcerpt: "weighs 220 g",
    });

    expect(insert).toHaveBeenCalledWith({
      product_id: productRow.id,
      feature_key: "weight",
      original_name: null,
      media_type: "text/plain",
      storage_path: null,
      extracted_text: "The shoe weighs 220 g.",
      supported: true,
      supporting_excerpt: "weighs 220 g",
    });
    expect(created).toEqual({
      id: evidenceRow.id,
      productId: productRow.id,
      featureKey: "weight",
      originalName: null,
      mediaType: "text/plain",
      storagePath: null,
      extractedText: "The shoe weighs 220 g.",
      supported: true,
      supportingExcerpt: "weighs 220 g",
      createdAt: evidenceRow.created_at,
    });
  });

  it("lists a product's evidence in creation order", async () => {
    const order = vi.fn().mockResolvedValue({ data: [evidenceRow], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };
    const repository = new SupabaseEvidenceRepository(client as never);

    const records = await repository.listForProduct(productRow.id);

    expect(eq).toHaveBeenCalledWith("product_id", productRow.id);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(records[0]).toMatchObject({
      id: evidenceRow.id,
      productId: productRow.id,
    });
  });

  it("maps an unknown evidence product to the repository contract", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23503", message: "foreign key violation" },
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const client = { from: vi.fn(() => ({ insert })) };
    const repository = new SupabaseEvidenceRepository(client as never);

    await expect(
      repository.create({
        productId: productRow.id,
        featureKey: "weight",
        originalName: null,
        mediaType: "text/plain",
        storagePath: null,
        extractedText: "The shoe weighs 220 g.",
        supported: true,
        supportingExcerpt: "weighs 220 g",
      }),
    ).rejects.toThrow("PRODUCT_NOT_FOUND");
  });
});

describe("SupabaseSessionRepository", () => {
  it("hydrates a session with its ordered messages", async () => {
    const sessionSingle = vi.fn().mockResolvedValue({
      data: {
        id: "session-1",
        product_id: "product-1",
        asked_feature_keys: ["weight"],
        created_at: "2026-08-29T00:00:00.000Z",
      },
      error: null,
    });
    const sessionEq = vi.fn(() => ({ maybeSingle: sessionSingle }));
    const messageOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "message-1",
          role: "assistant",
          content: "What is the measured weight?",
          feature_key: "weight",
          created_at: "2026-08-29T00:00:01.000Z",
        },
      ],
      error: null,
    });
    const messageEq = vi.fn(() => ({ order: messageOrder }));
    const client = {
      from: vi.fn((table: string) =>
        table === "interview_sessions"
          ? { select: () => ({ eq: sessionEq }) }
          : { select: () => ({ eq: messageEq }) },
      ),
    };
    const repository = new SupabaseSessionRepository(client as never);

    const session = await repository.get("session-1");

    expect(session?.messages[0]).toMatchObject({
      id: "message-1",
      featureKey: "weight",
    });
  });
});
