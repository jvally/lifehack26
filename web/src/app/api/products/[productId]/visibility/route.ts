import { z } from "zod";
import { buildVisibilityReport } from "@/features/visibility/build-visibility-report";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { loadIntelligence } from "@/services/application-service";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const dependencies = getApplicationDependencies();
    const product = await dependencies.products.get(productId);
    if (!product?.passport || !product.evaluation) throw new Error("PRODUCT_PASSPORT_NOT_FOUND");
    const intelligence = await loadIntelligence(productId, dependencies);
    const peers = await dependencies.products.listByCategory(product.category);
    const competitorReadiness = peers
      .filter((peer) => peer.id !== productId)
      .flatMap((peer) => peer.evaluation ? [peer.evaluation.readiness.total] : []);
    return apiSuccess(buildVisibilityReport(product.evaluation, intelligence, competitorReadiness));
  });
}
