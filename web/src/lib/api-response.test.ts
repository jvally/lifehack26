import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  ApiRequestError,
  apiSuccess,
  withApiErrors,
} from "./api-response";

describe("apiSuccess", () => {
  it("returns the shared success envelope", async () => {
    const response = apiSuccess({ productIds: ["product-1"] }, 201, "request-1");

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      data: { productIds: ["product-1"] },
      requestId: "request-1",
    });
  });
});

describe("withApiErrors", () => {
  it("returns validation details for Zod failures", async () => {
    const response = await withApiErrors(async () => {
      z.object({ name: z.string().min(1) }).parse({ name: "" });
      return apiSuccess(null);
    }, "request-validation");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED", details: expect.any(Array) },
      requestId: "request-validation",
    });
  });

  it("preserves known status and details", async () => {
    const response = await withApiErrors(async () => {
      throw new ApiRequestError(
        "CATALOG_VALIDATION_FAILED",
        "Catalog input validation failed",
        400,
        [{ row: 2, code: "NAME_REQUIRED" }],
      );
    }, "request-known");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "CATALOG_VALIDATION_FAILED",
        details: [{ row: 2, code: "NAME_REQUIRED" }],
      },
    });
  });

  it("hides unexpected internal error messages", async () => {
    const response = await withApiErrors(async () => {
      throw new Error("database password leaked here");
    }, "request-unexpected");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "The operation failed.",
      },
      requestId: "request-unexpected",
    });
  });
});
