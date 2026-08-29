import { describe, expect, it, vi } from "vitest";
import { InMemoryProductRepository } from "@/services/repositories/in-memory";
import { CsvCatalogAdapter } from "./adapters";
import { importProducts } from "./import-product";

describe("importProducts", () => {
  it("imports every validated CSV row", async () => {
    const repository = new InMemoryProductRepository();
    const createMany = vi.spyOn(repository, "createMany");
    const input = [
      "id,name,category,description,price,currency",
      "1,CloudRun Pro,running_shoes,Lightweight shoe,179,SGD",
      "2,Road Tempo,running_shoes,Tempo shoe,199,SGD",
    ].join("\n");

    const products = await importProducts(
      new CsvCatalogAdapter(),
      input,
      repository,
    );

    expect(products).toHaveLength(2);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(products.every((product) => product.sourceType === "csv")).toBe(true);
    expect(await repository.listByCategory("running_shoes")).toHaveLength(2);
  });

  it("creates no products when any input row is invalid", async () => {
    const repository = new InMemoryProductRepository();
    const input = [
      "id,name,category,description,price,currency",
      "1,CloudRun Pro,running_shoes,Lightweight shoe,179,SGD",
      "2,,running_shoes,Invalid shoe,199,SGD",
    ].join("\n");

    await expect(
      importProducts(new CsvCatalogAdapter(), input, repository),
    ).rejects.toThrow("Catalog input validation failed");
    expect(await repository.listByCategory("running_shoes")).toHaveLength(0);
  });

  it("commits no products when a validated batch violates uniqueness", async () => {
    const repository = new InMemoryProductRepository();
    const input = [
      "id,name,category,description,price,currency",
      "duplicate,CloudRun Pro,running_shoes,Lightweight shoe,179,SGD",
      "duplicate,Road Tempo,running_shoes,Tempo shoe,199,SGD",
    ].join("\n");

    await expect(
      importProducts(new CsvCatalogAdapter(), input, repository),
    ).rejects.toThrow("PRODUCT_EXTERNAL_ID_DUPLICATE");
    expect(await repository.listByCategory("running_shoes")).toHaveLength(0);
  });
});
