import { z } from "zod";
import { ApiRequestError, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const product = await getApplicationDependencies().products.get(productId);
    if (!product?.passport) {
      throw new ApiRequestError(
        "PRODUCT_PASSPORT_NOT_FOUND",
        "The Product Passport was not found.",
        404,
      );
    }
    return new Response(JSON.stringify(product.passport, null, 2), {
      headers: {
        "content-disposition": 'attachment; filename="product-passport.json"',
        "content-type": "application/json; charset=utf-8",
      },
    });
  });
}
