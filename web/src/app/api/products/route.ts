import { z } from "zod";
import {
  CsvCatalogAdapter,
  JsonCatalogAdapter,
  TextCatalogAdapter,
} from "@/features/catalog/adapters";
import { importProducts } from "@/features/catalog/import-product";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const RequestSchema = z.object({
  format: z.enum(["text", "json", "csv"]),
  content: z.string().min(1),
});

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const body = RequestSchema.parse(await request.json());
    const adapter =
      body.format === "csv"
        ? new CsvCatalogAdapter()
        : body.format === "json"
          ? new JsonCatalogAdapter()
          : new TextCatalogAdapter();
    const { products } = getApplicationDependencies();
    const imported = await importProducts(adapter, body.content, products);
    return apiSuccess(
      { productIds: imported.map((product) => product.id) },
      201,
    );
  });
}