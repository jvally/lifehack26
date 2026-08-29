import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawProductInput } from "@/services/repositories/contracts";
import { GET, POST } from "./route";

const repositoryMocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/services/container", () => ({
  getApplicationDependencies: () => ({
    products: {
      createMany: repositoryMocks.createMany.mockImplementation(async (inputs: RawProductInput[]) =>
        inputs.map((input) => ({
          ...input,
          id: "product-1",
          passport: null,
          originalPassport: null,
          evaluation: null,
          embedding: null,
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
        })),
      ),
      list: repositoryMocks.list,
    },
  }),
}));

const publicRecords = [
        {
          id: "product-1",
          externalId: "cloudrun-pro",
          name: "CloudRun Pro",
          category: "running_shoes",
          rawListing: "CloudRun Pro\nPrice: S$179",
          price: 179,
          currency: "SGD",
          sourceType: "text" as const,
          passport: {
            name: "CloudRun Pro",
            category: "running_shoes",
            description: "Lightweight running shoe.",
            features: [],
            completenessScore: 0.8,
            confidenceScore: 0.9,
          },
          originalPassport: null,
          evaluation: null,
          embedding: null,
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
        },
        {
          id: "product-2",
          externalId: "trailmaster",
          name: "TrailMaster",
          category: "running_shoes",
          rawListing: "TrailMaster shoe",
          price: 199,
          currency: "SGD",
          sourceType: "text" as const,
          passport: null,
          originalPassport: {
            name: "TrailMaster",
            category: "running_shoes",
            description: "Durable trail shoe.",
            features: [],
            completenessScore: 0.7,
            confidenceScore: 0.8,
          },
          evaluation: null,
          embedding: null,
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
        },
      ];

beforeEach(() => {
  repositoryMocks.createMany.mockClear();
  repositoryMocks.list.mockReset();
  repositoryMocks.list.mockResolvedValue(publicRecords);
});

describe("POST /api/products", () => {
  it("imports a pasted listing", async () => {
    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        format: "text",
        content: "CloudRun Pro\nLightweight shoe\nPrice: S$179",
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      data: { productIds: ["product-1"] },
    });
  });
});

describe("GET /api/products", () => {
  it("returns a list of public products with passports or fallback descriptions", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        products: [
          {
            id: "product-1",
            name: "CloudRun Pro",
            category: "running_shoes",
            description: "Lightweight running shoe.",
            price: 179,
            currency: "SGD",
          },
          {
            id: "product-2",
            name: "TrailMaster",
            category: "running_shoes",
            description: "Durable trail shoe.",
            price: 199,
            currency: "SGD",
          },
        ],
      },
    });
  });

  it("returns an empty public catalogue", async () => {
    repositoryMocks.list.mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { products: [] },
    });
  });

  it("uses the shared error envelope when listing products fails", async () => {
    repositoryMocks.list.mockRejectedValueOnce(
      new Error("PRODUCT_REPOSITORY_LIST_FAILED"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "The operation failed.",
      },
      requestId: expect.any(String),
    });
  });
});
