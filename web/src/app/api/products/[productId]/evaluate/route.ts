import { z } from "zod";
import { evaluateListing } from "@/features/evaluation/evaluate-listing";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { loadIntelligence } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const dependencies = getApplicationDependencies();
    const product = await dependencies.products.get(productId);
    if (!product?.passport) throw new Error("PRODUCT_PASSPORT_NOT_FOUND");
    const intelligence = await loadIntelligence(productId, dependencies);
    const evaluation = evaluateListing(product.passport, intelligence);
    await dependencies.products.saveEvaluation(productId, evaluation);
    return apiSuccess({ evaluation, intelligence });
  });
}
