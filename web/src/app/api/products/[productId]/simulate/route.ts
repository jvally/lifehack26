import { z } from "zod";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });
const RequestSchema = z
  .object({ query: z.string().trim().min(5).max(2000) })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const { query } = RequestSchema.parse(await request.json());
    return apiSuccess(
      await getApplicationDependencies().application.simulateProduct(
        productId,
        query,
      ),
    );
  });
}
