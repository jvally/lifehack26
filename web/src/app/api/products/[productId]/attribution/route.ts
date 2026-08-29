import { z } from "zod";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const ParamsSchema = z.object({ productId: z.string().uuid() });
const RequestSchema = z.object({
  source: z.enum(["retail_ready_simulator", "chatgpt", "shopping_agent", "other"]),
  eventType: z.enum(["product_view", "conversion"]),
  referralToken: z.string().min(8).max(100),
}).strict();

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    return apiSuccess(await getApplicationDependencies().attribution.listForProduct(productId));
  });
}

export async function POST(request: Request, context: { params: Promise<{ productId: string }> }) {
  return withApiErrors(async () => {
    const { productId } = ParamsSchema.parse(await context.params);
    const input = RequestSchema.parse(await request.json());
    return apiSuccess(await getApplicationDependencies().attribution.create({ ...input, productId, query: null }), 201);
  });
}
