import { z } from "zod";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { analyzeProduct } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    return apiSuccess(
      await analyzeProduct(productId, getApplicationDependencies()),
    );
  });
}
