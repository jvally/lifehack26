import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawProductInput } from "@/services/repositories/contracts";
import { POST as answerInterview } from "./interviews/[sessionId]/answers/route";
import { POST as importMarketSignals } from "./market-signals/import/route";
import { GET as getProduct } from "./products/[productId]/route";
import { POST as evaluateProduct } from "./products/[productId]/evaluate/route";
import { POST as extractProduct } from "./products/[productId]/extract/route";
import { GET as exportProduct } from "./products/[productId]/export/route";
import { POST as startInterview } from "./products/[productId]/interviews/route";
import { POST as simulateProduct } from "./products/[productId]/simulate/route";
import { POST as importProducts } from "./products/route";

const productId = "8d649ffc-9553-4e64-a3ae-1dba7ab65499";
const sessionId = "4b7f22a1-9883-40b5-ab27-f407415670d8";

const mocks = vi.hoisted(() => {
  const product = {
    id: "8d649ffc-9553-4e64-a3ae-1dba7ab65499",
    externalId: null,
    name: "CloudRun Pro",
    category: "running_shoes",
    rawListing: "CloudRun Pro\nPrice: S$179",
    price: 179,
    currency: "SGD",
    sourceType: "text" as const,
    passport: null as { productId: string } | null,
    originalPassport: null,
    evaluation: null,
    embedding: null,
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
  };
  return {
    product,
    products: {
      create: vi.fn(async (input) => ({ ...product, ...input })),
      createMany: vi.fn(async (inputs: RawProductInput[]) =>
        inputs.map((input) => ({ ...product, ...input })),
      ),
      get: vi.fn(async () => product),
      saveEvaluation: vi.fn(async () => undefined),
    },
    sessions: {
      get: vi.fn(async () => ({ productId: product.id })),
    },
    ai: {},
    embeddings: {},
    market: {},
    evidence: {},
    intelligence: { category: "running_shoes" },
    evaluation: { scoringVersion: "1.0.0" },
    analyzeProduct: vi.fn(async () => ({ passport: { productId: product.id } })),
    loadIntelligence: vi.fn(async () => ({ category: "running_shoes" })),
    evaluateListing: vi.fn(() => ({ scoringVersion: "1.0.0" })),
    startInterview: vi.fn(async () => ({ session: { id: "session-1" } })),
    answerInterview: vi.fn(async () => ({ nextGap: null })),
    simulateRecommendation: vi.fn(async () => ({ before: {}, after: {} })),
    importMarketSignals: vi.fn(async (signals) => signals),
  };
});

vi.mock("@/services/container", () => ({
  getApplicationDependencies: () => ({
    products: mocks.products,
    sessions: mocks.sessions,
    ai: mocks.ai,
    embeddings: mocks.embeddings,
    market: mocks.market,
    evidence: mocks.evidence,
  }),
}));

vi.mock("@/services/application-service", () => ({
  analyzeProduct: mocks.analyzeProduct,
  loadIntelligence: mocks.loadIntelligence,
}));

vi.mock("@/features/evaluation/evaluate-listing", () => ({
  evaluateListing: mocks.evaluateListing,
}));

vi.mock("@/features/interviews/interview-service", () => ({
  startInterview: mocks.startInterview,
  answerInterview: mocks.answerInterview,
}));

vi.mock("@/features/recommendation/simulate-recommendation", () => ({
  simulateRecommendation: mocks.simulateRecommendation,
}));

vi.mock("@/features/market/import-market-signals", () => ({
  importMarketSignals: mocks.importMarketSignals,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("product routes", () => {
  it("imports a pasted listing using the success envelope", async () => {
    const response = await importProducts(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          format: "text",
          content: "CloudRun Pro\nPrice: S$179",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { productIds: [productId] },
      requestId: expect.any(String),
    });
  });

  it("returns a structured 400 for malformed import input", async () => {
    const response = await importProducts(
      new Request("http://localhost/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "text", content: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
  });

  it("returns a product and exports its passport as a JSON download", async () => {
    const context = { params: Promise.resolve({ productId }) };
    const response = await getProduct(new Request("http://localhost"), context);
    expect(await response.json()).toMatchObject({ ok: true, data: { id: productId } });

    mocks.products.get.mockResolvedValueOnce({
      ...mocks.product,
      passport: { productId },
    });
    const exported = await exportProduct(new Request("http://localhost"), context);
    expect(exported.headers.get("content-type")).toContain("application/json");
    expect(exported.headers.get("content-disposition")).toBe(
      'attachment; filename="product-passport.json"',
    );
    expect(await exported.json()).toEqual({ productId });
  });
});

describe("application service routes", () => {
  it("delegates extraction and evaluation", async () => {
    const context = { params: Promise.resolve({ productId }) };
    await extractProduct(new Request("http://localhost", { method: "POST" }), context);
    mocks.products.get.mockResolvedValueOnce({
      ...mocks.product,
      passport: { productId },
    });
    await evaluateProduct(new Request("http://localhost", { method: "POST" }), context);

    expect(mocks.analyzeProduct).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ products: mocks.products }),
    );
    expect(mocks.loadIntelligence).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ products: mocks.products }),
    );
    expect(mocks.evaluateListing).toHaveBeenCalledWith(
      { productId },
      expect.objectContaining({ category: "running_shoes" }),
    );
    expect(mocks.products.saveEvaluation).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ scoringVersion: "1.0.0" }),
    );
  });

  it("delegates interview start and validated answers", async () => {
    await startInterview(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ productId }) },
    );
    const response = await answerInterview(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featureKey: "weight",
          label: "Measured weight",
          value: 220,
          unit: "g",
          unknown: false,
          evidenceId: null,
          evidenceText: "Specification sheet",
        }),
      }),
      { params: Promise.resolve({ sessionId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.startInterview).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ intelligence: expect.any(Object) }),
    );
    expect(mocks.answerInterview).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({ featureKey: "weight", value: 220 }),
      expect.objectContaining({ intelligence: expect.any(Object) }),
    );
  });

  it("delegates simulation and market signal import", async () => {
    await simulateProduct(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "lightweight road shoes" }),
      }),
      { params: Promise.resolve({ productId }) },
    );
    const signal = {
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
    await importMarketSignals(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signals: [signal] }),
      }),
    );

    expect(mocks.simulateRecommendation).toHaveBeenCalledWith(
      productId,
      "lightweight road shoes",
      expect.objectContaining({ products: mocks.products }),
    );
    expect(mocks.importMarketSignals).toHaveBeenCalledWith(
      [signal],
      {
        embeddings: mocks.embeddings,
        market: mocks.market,
      },
    );
  });
});
