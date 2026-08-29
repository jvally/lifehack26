import { describe, expect, it } from "vitest";
import {
  CatalogValidationError,
  CsvCatalogAdapter,
  JsonCatalogAdapter,
  TextCatalogAdapter,
} from "./adapters";

describe("TextCatalogAdapter", () => {
  it("normalizes one pasted listing", () => {
    const products = new TextCatalogAdapter().parse(
      "CloudRun Pro\nLightweight running shoe\nPrice: S$179",
    );

    expect(products).toEqual([
      expect.objectContaining({
        name: "CloudRun Pro",
        category: "running_shoes",
        price: 179,
        currency: "SGD",
        sourceType: "text",
      }),
    ]);
  });

  it("rejects empty listing text", () => {
    expect(() => new TextCatalogAdapter().parse("  ")).toThrow(
      "Listing text is empty",
    );
  });
});

describe("JsonCatalogAdapter", () => {
  it("normalizes one JSON product", () => {
    const products = new JsonCatalogAdapter().parse(
      JSON.stringify({
        id: "cloudrun",
        name: "CloudRun Pro",
        category: "running_shoes",
        description: "Lightweight shoe",
        price: 179,
        currency: "sgd",
      }),
    );

    expect(products[0]).toMatchObject({
      externalId: "cloudrun",
      name: "CloudRun Pro",
      currency: "SGD",
      sourceType: "json",
    });
  });

  it("reports every invalid JSON row", () => {
    try {
      new JsonCatalogAdapter().parse(
        JSON.stringify([
          { name: "", price: 179 },
          { name: "Second", price: -1 },
        ]),
      );
      throw new Error("Expected adapter to reject invalid rows");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogValidationError);
      expect((error as CatalogValidationError).issues).toEqual([
        expect.objectContaining({ row: 1, code: "NAME_REQUIRED" }),
        expect.objectContaining({ row: 2, code: "PRICE_INVALID" }),
      ]);
    }
  });

  it("rejects malformed JSON with a structured error", () => {
    expect(() => new JsonCatalogAdapter().parse("{"))
      .toThrowError(CatalogValidationError);
  });
});

describe("CsvCatalogAdapter", () => {
  it("rejects a header-only CSV with a structured error", () => {
    try {
      new CsvCatalogAdapter().parse("id,name,category,description,price,currency");
      throw new Error("Expected adapter to reject an empty CSV");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogValidationError);
      expect((error as CatalogValidationError).issues).toEqual([
        expect.objectContaining({ row: 2, code: "CSV_EMPTY" }),
      ]);
    }
  });

  it("reports one-based source rows for invalid CSV data", () => {
    const input = [
      "id,name,category,description,price,currency",
      "1,,running_shoes,Shoe,179,SGD",
      "2,Second,running_shoes,Shoe,invalid,SGD",
    ].join("\n");

    try {
      new CsvCatalogAdapter().parse(input);
      throw new Error("Expected adapter to reject invalid rows");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogValidationError);
      expect((error as CatalogValidationError).issues).toEqual([
        expect.objectContaining({ row: 2, code: "NAME_REQUIRED" }),
        expect.objectContaining({ row: 3, code: "PRICE_INVALID" }),
      ]);
    }
  });
});
