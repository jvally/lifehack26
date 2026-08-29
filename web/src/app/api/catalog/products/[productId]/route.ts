import { z } from "zod";
import { ApiRequestError, apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";
import type { PublicProduct } from "@/app/api/products/route";
import type { ProductPassport } from "@/domain/passport";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export type PublicProductDetail = PublicProduct & {
  features: Array<{
    key: string;
    label: string;
    value: NonNullable<ProductPassport["features"][number]["value"]> | null;
    unit: string | null;
  }>;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const product = await getApplicationDependencies().products.get(productId);
    
    if (!product) {
      throw new ApiRequestError(
        "PRODUCT_NOT_FOUND",
        "The product was not found.",
        404,
      );
    }

    const publicProduct: PublicProductDetail = {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.passport?.description || product.originalPassport?.description || "",
      price: product.price,
      currency: product.currency,
      features: (product.passport?.features ?? [])
        .filter((feature) => feature.value !== null && feature.status !== "missing")
        .map((feature) => ({
          key: feature.key,
          label: feature.label,
          value: feature.value,
          unit: feature.unit,
        })),
    };

    return apiSuccess(publicProduct);
  });
}
