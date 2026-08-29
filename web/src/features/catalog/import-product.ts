import type {
  ProductRecord,
  ProductRepository,
} from "@/services/repositories/contracts";
import type { CatalogSourceAdapter } from "./adapters";

export async function importProducts(
  adapter: CatalogSourceAdapter,
  input: string,
  repository: ProductRepository,
): Promise<ProductRecord[]> {
  const parsed = adapter.parse(input);
  return repository.createMany(parsed);
}
