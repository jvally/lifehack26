import { z } from "zod";
import { simulateRecommendation } from "@/features/recommendation/simulate-recommendation";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });
const RequestSchema = z
  .object({
    query: z.string().trim().min(5).max(2000),
    profileId: z.string().trim().max(80).optional(),
    source: z.enum(["retail_ready_simulator", "chatgpt", "shopping_agent", "other"]).optional(),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const { query, profileId, source } = RequestSchema.parse(await request.json());
    const dependencies = getApplicationDependencies();
    const result = profileId || source
      ? await simulateRecommendation(productId, query, dependencies, { profileId, source })
      : await simulateRecommendation(productId, query, dependencies);
    return apiSuccess(result);
  });
}
