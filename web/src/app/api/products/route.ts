import { z } from "zod";
import {
  CsvCatalogAdapter,
  JsonCatalogAdapter,
  TextCatalogAdapter,
} from "@/features/catalog/adapters";
import { importProducts } from "@/features/catalog/import-product";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const RequestSchema = z
  .object({
    format: z.enum(["text", "json", "csv"]),
    content: z.string().min(1).max(1_000_000),
  })
  .strict();

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const body = RequestSchema.parse(await request.json());
    const adapter =
      body.format === "csv"
        ? new CsvCatalogAdapter()
        : body.format === "json"
          ? new JsonCatalogAdapter()
          : new TextCatalogAdapter();
    const imported = await importProducts(
      adapter,
      body.content,
      getApplicationDependencies().products,
    );
    return apiSuccess(
      { productIds: imported.map((product) => product.id) },
      201,
    );
  });
}

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number | null;
  currency: string | null;
};

export async function GET() {
  return withApiErrors(async () => {
    const products = await getApplicationDependencies().products.list();
    const publicProducts: PublicProduct[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.passport?.description || p.originalPassport?.description || "",
      price: p.price,
      currency: p.currency,
    }));
    return apiSuccess({ products: publicProducts });
  });
}
