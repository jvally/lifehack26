import { z } from "zod";
import {
  ApiRequestError,
  apiSuccess,
  withApiErrors,
} from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

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
    return apiSuccess(product);
  });
}
