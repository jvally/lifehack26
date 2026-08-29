import { z } from "zod";
import { MarketSignalSchema } from "@/domain/market";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const RequestSchema = z
  .object({ signals: z.array(MarketSignalSchema).min(1).max(1000) })
  .strict();

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const { signals } = RequestSchema.parse(await request.json());
    return apiSuccess(
      await getApplicationDependencies().application.importMarketSignals(
        signals,
      ),
      201,
    );
  });
}
