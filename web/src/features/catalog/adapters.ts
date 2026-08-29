import Papa from "papaparse";
import type { RawProductInput } from "@/services/repositories/contracts";
import { detectCategory } from "./detect-category";

export type CatalogIssue = {
  row: number;
  code: string;
  message: string;
};

export class CatalogValidationError extends Error {
  readonly code = "CATALOG_VALIDATION_FAILED";

  constructor(
    readonly issues: CatalogIssue[],
    message = "Catalog input validation failed",
  ) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

export interface CatalogSourceAdapter {
  parse(input: string): RawProductInput[];
}

function moneyFromText(text: string): {
  price: number | null;
  currency: string | null;
} {
  const match = text.match(/(?:S\$|SGD\s*)(\d+(?:\.\d{1,2})?)/i);
  return match
    ? { price: Number(match[1]), currency: "SGD" }
    : { price: null, currency: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRow(
  row: Record<string, unknown>,
  rowNumber: number,
  sourceType: "json" | "csv",
): { product: RawProductInput | null; issues: CatalogIssue[] } {
  const issues: CatalogIssue[] = [];
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) {
    issues.push({
      row: rowNumber,
      code: "NAME_REQUIRED",
      message: `${sourceType.toUpperCase()} row ${rowNumber} is missing name`,
    });
  }

  const categoryValue = row.category;
  const category =
    categoryValue === undefined || categoryValue === null || categoryValue === ""
      ? detectCategory(`${name} ${typeof row.description === "string" ? row.description : ""}`)
      : typeof categoryValue === "string" && categoryValue.trim()
        ? categoryValue.trim()
        : null;
  if (category === null) {
    issues.push({
      row: rowNumber,
      code: "CATEGORY_INVALID",
      message: `${sourceType.toUpperCase()} row ${rowNumber} has invalid category`,
    });
  }

  let price: number | null = null;
  if (row.price !== undefined && row.price !== null && row.price !== "") {
    if (
      typeof row.price !== "number" ||
      !Number.isFinite(row.price) ||
      row.price < 0
    ) {
      issues.push({
        row: rowNumber,
        code: "PRICE_INVALID",
        message: `${sourceType.toUpperCase()} row ${rowNumber} has invalid price`,
      });
    } else {
      price = row.price;
    }
  }

  let currency: string | null = null;
  if (row.currency !== undefined && row.currency !== null && row.currency !== "") {
    if (typeof row.currency !== "string" || row.currency.trim().length !== 3) {
      issues.push({
        row: rowNumber,
        code: "CURRENCY_INVALID",
        message: `${sourceType.toUpperCase()} row ${rowNumber} has invalid currency`,
      });
    } else {
      currency = row.currency.trim().toUpperCase();
    }
  }

  const description =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : name;
  const externalId =
    typeof row.id === "string" && row.id.trim() ? row.id.trim() : null;

  if (issues.length > 0 || category === null) {
    return { product: null, issues };
  }

  return {
    product: {
      externalId,
      name,
      category,
      rawListing: description,
      price,
      currency,
      sourceType,
    },
    issues,
  };
}

function finishRows(
  rows: Array<{ product: RawProductInput | null; issues: CatalogIssue[] }>,
): RawProductInput[] {
  const issues = rows.flatMap((row) => row.issues);
  if (issues.length > 0) throw new CatalogValidationError(issues);
  return rows.flatMap(({ product }) => (product ? [product] : []));
}

export class TextCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new CatalogValidationError(
        [{ row: 1, code: "TEXT_EMPTY", message: "Listing text is empty" }],
        "Listing text is empty",
      );
    }
    const [firstLine] = trimmed.split(/\r?\n/);
    const money = moneyFromText(trimmed);
    return [
      {
        externalId: null,
        name: firstLine.trim(),
        category: detectCategory(trimmed),
        rawListing: trimmed,
        price: money.price,
        currency: money.currency,
        sourceType: "text",
      },
    ];
  }
}

export class JsonCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    let decoded: unknown;
    try {
      decoded = JSON.parse(input);
    } catch {
      throw new CatalogValidationError([
        { row: 1, code: "JSON_MALFORMED", message: "JSON input is malformed" },
      ]);
    }
    const values = Array.isArray(decoded) ? decoded : [decoded];
    if (values.length === 0) {
      throw new CatalogValidationError([
        { row: 1, code: "JSON_EMPTY", message: "JSON input contains no products" },
      ]);
    }
    return finishRows(
      values.map((value, index) =>
        isRecord(value)
          ? normalizeRow(value, index + 1, "json")
          : {
              product: null,
              issues: [
                {
                  row: index + 1,
                  code: "ROW_INVALID",
                  message: `JSON row ${index + 1} must be an object`,
                },
              ],
            },
      ),
    );
  }
}

export class CsvCatalogAdapter implements CatalogSourceAdapter {
  parse(input: string): RawProductInput[] {
    const result = Papa.parse<Record<string, string>>(input, {
      header: true,
      skipEmptyLines: true,
    });
    const parseIssues: CatalogIssue[] = result.errors.map((error) => ({
      row: (error.row ?? 0) + 2,
      code: "CSV_MALFORMED",
      message: `CSV row ${(error.row ?? 0) + 2}: ${error.message}`,
    }));
    const normalized = result.data.map((row, index) => {
      const priceText = row.price?.trim();
      const price = priceText ? Number(priceText) : null;
      return normalizeRow(
        {
          ...row,
          price: priceText && Number.isFinite(price) ? price : priceText || null,
        },
        index + 2,
        "csv",
      );
    });
    if (normalized.length === 0 && parseIssues.length === 0) {
      throw new CatalogValidationError([
        { row: 2, code: "CSV_EMPTY", message: "CSV input contains no products" },
      ]);
    }
    const issues = [...parseIssues, ...normalized.flatMap((row) => row.issues)];
    if (issues.length > 0) throw new CatalogValidationError(issues);
    return normalized.flatMap(({ product }) => (product ? [product] : []));
  }
}
