import { z } from "zod";
import { MarketSignalSchema } from "@/domain/market";
import { importMarketSignals } from "@/features/market/import-market-signals";
import { apiSuccess, withApiErrors } from "@/lib/api-response";
import { getApplicationDependencies } from "@/services/container";

const RequestSchema = z
  .object({ signals: z.array(MarketSignalSchema).min(1).max(1000) })
  .strict();

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const { signals } = RequestSchema.parse(await request.json());
    const dependencies = getApplicationDependencies();
    const imported = await importMarketSignals(signals, {
      embeddings: dependencies.embeddings,
      market: dependencies.market,
    });
    return apiSuccess({ importedCount: imported.length }, 201);
  });
}
