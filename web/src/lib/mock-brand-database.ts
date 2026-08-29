import type { ProductPassport } from "@/domain/passport";

export type MockBrandProduct = {
  id: string;
  sourceFormat: "text" | "json" | "csv";
  sourceListing: string;
  passport: ProductPassport | null;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "retailready:mock-brand-database:v1";
let fallbackProducts: MockBrandProduct[] = [];

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  return typeof storage?.getItem === "function" && typeof storage?.setItem === "function"
    ? storage
    : null;
}

function readAll(): MockBrandProduct[] {
  const storage = browserStorage();
  if (!storage) return structuredClone(fallbackProducts);
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as MockBrandProduct[]) : [];
  } catch {
    return structuredClone(fallbackProducts);
  }
}

function writeAll(products: MockBrandProduct[]): void {
  fallbackProducts = structuredClone(products);
  const storage = browserStorage();
  if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function createMockBrandProduct(
  sourceFormat: MockBrandProduct["sourceFormat"],
  sourceListing: string,
): MockBrandProduct {
  const timestamp = new Date().toISOString();
  const product: MockBrandProduct = {
    id: crypto.randomUUID(),
    sourceFormat,
    sourceListing,
    passport: null,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeAll([...readAll(), product]);
  return product;
}

export function getMockBrandProduct(productId: string): MockBrandProduct | null {
  return readAll().find((product) => product.id === productId) ?? null;
}

export function approveMockBrandProduct(
  productId: string,
  passport: ProductPassport,
): MockBrandProduct {
  const products = readAll();
  const existingIndex = products.findIndex((product) => product.id === productId);
  const timestamp = new Date().toISOString();
  const existing = products[existingIndex];
  const updated: MockBrandProduct = {
    id: productId,
    sourceFormat: existing?.sourceFormat ?? "text",
    sourceListing: existing?.sourceListing ?? "Offline demo product",
    passport,
    status: "approved",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex === -1) products.push(updated);
  else products[existingIndex] = updated;
  writeAll(products);
  return updated;
}

export function clearMockBrandDatabase(): void {
  fallbackProducts = [];
  const storage = browserStorage();
  if (storage && typeof storage.removeItem === "function") {
    storage.removeItem(STORAGE_KEY);
  }
}
