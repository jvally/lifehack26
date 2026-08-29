import type { QueryIntent } from "@/domain/market";
import type { AiGateway } from "@/services/ai-gateway";

export async function parseBuyerQuery(
  query: string,
  ai: AiGateway,
): Promise<QueryIntent> {
  const trimmed = query.trim();
  if (trimmed.length < 5) {
    throw new Error("BUYER_QUERY_TOO_SHORT");
  }
  return ai.parseQuery(trimmed);
}