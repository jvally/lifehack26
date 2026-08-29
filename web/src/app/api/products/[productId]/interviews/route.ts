import { z } from "zod";
import { startInterview } from "@/features/interviews/interview-service";
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
    const intelligence = await loadIntelligence(productId, dependencies);
    return apiSuccess(
      await startInterview(productId, { ...dependencies, intelligence }),
      201,
    );
  });
}
