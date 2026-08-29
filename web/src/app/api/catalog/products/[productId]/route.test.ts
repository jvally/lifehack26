import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const productId = "8d649ffc-9553-4e64-a3ae-1dba7ab65499";
const repositoryMocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/services/container", () => ({
  getApplicationDependencies: () => ({ products: { get: repositoryMocks.get } }),
}));

beforeEach(() => {
  repositoryMocks.get.mockReset();
});

describe("GET /api/catalog/products/[productId]", () => {
  it("returns only buyer-safe listing fields and populated passport facts", async () => {
    repositoryMocks.get.mockResolvedValue({
      id: productId,
      name: "CloudRun Pro",
      category: "running_shoes",
      price: 179,
      currency: "SGD",
      passport: {
        description: "A lightweight road running shoe.",
        features: [
          {
            key: "weight",
            label: "Measured weight",
            value: 220,
            unit: "g",
            status: "verified",
            confidence: 0.95,
            evidenceIds: ["evidence-1"],
          },
          {
            key: "terrain",
            label: "Terrain",
            value: null,
            unit: null,
            status: "missing",
            confidence: 0,
            evidenceIds: [],
          },
        ],
      },
      originalPassport: null,
      evaluation: { readiness: { total: 40 } },
      embedding: [0.1],
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ productId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        data: {
          id: productId,
          name: "CloudRun Pro",
          category: "running_shoes",
          description: "A lightweight road running shoe.",
          price: 179,
          currency: "SGD",
          features: [
            { key: "weight", label: "Measured weight", value: 220, unit: "g" },
          ],
        },
      }),
    );
    expect(JSON.stringify(body)).not.toContain("evaluation");
    expect(JSON.stringify(body)).not.toContain("embedding");
    expect(JSON.stringify(body)).not.toContain("evidenceIds");
  });

  it("returns the shared 404 envelope for a missing product", async () => {
    repositoryMocks.get.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ productId }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "PRODUCT_NOT_FOUND", message: "The product was not found." },
    });
  });
});
