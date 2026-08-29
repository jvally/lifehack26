import { describe, expect, it } from "vitest";
import { readApiData } from "./client-api";

describe("readApiData", () => {
  it("returns data from a successful API envelope", async () => {
    const response = new Response(
      JSON.stringify({
        ok: true,
        data: { productIds: ["product-1"] },
        requestId: "request-success",
      }),
      { status: 201 },
    );

    await expect(
      readApiData<{ productIds: string[] }>(response, "Import failed."),
    ).resolves.toEqual({ productIds: ["product-1"] });
  });

  it("throws the server message and request ID for an API error", async () => {
    const response = new Response(
      JSON.stringify({
        ok: false,
        error: { message: "The listing format is invalid." },
        requestId: "request-invalid",
      }),
      { status: 400 },
    );

    await expect(
      readApiData(response, "Import failed."),
    ).rejects.toMatchObject({
      name: "ClientApiError",
      message: "The listing format is invalid. Request ID: request-invalid",
      requestId: "request-invalid",
    });
  });

  it("uses the fallback message when the response is not valid JSON", async () => {
    const response = new Response("service unavailable", { status: 502 });

    await expect(
      readApiData(response, "Import failed."),
    ).rejects.toMatchObject({
      message: "Import failed.",
      requestId: null,
    });
  });
});
