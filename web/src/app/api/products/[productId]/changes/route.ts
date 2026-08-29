import { z } from "zod";
import { ApiRequestError, withApiErrors } from "@/lib/api-response";
import { buildImplementationPatch } from "@/domain/implementation-patch";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const product = await getApplicationDependencies().products.get(productId);
    if (!product?.passport || !product.originalPassport) {
      throw new ApiRequestError("IMPLEMENTATION_PATCH_NOT_READY", "Complete and save seller improvements before exporting a patch.", 409);
    }
    const patch = buildImplementationPatch(product.originalPassport, product.passport);
    return new Response(JSON.stringify(patch, null, 2), {
      headers: {
        "content-disposition": `attachment; filename="${productId}-implementation-patch.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  });
}
