import { describe, expect, it, vi } from "vitest";
import type { RawProductInput } from "@/services/repositories/contracts";
import { POST } from "./route";

vi.mock("@/services/container", () => ({
  getApplicationDependencies: () => ({
    products: {
      createMany: vi.fn(async (inputs: RawProductInput[]) =>
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
    },
  }),
}));

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
