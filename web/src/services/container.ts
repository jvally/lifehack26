import "server-only";
import { OpenAIAiGateway } from "./ai-gateway";
import { OpenAIEmbeddingService } from "./embeddings";
import { SupabaseEvidenceRepository } from "./repositories/supabase-evidence-repository";
import { SupabaseMarketRepository } from "./repositories/supabase-market-repository";
import { SupabaseProductRepository } from "./repositories/supabase-product-repository";
import { SupabaseSessionRepository } from "./repositories/supabase-session-repository";

export function getApplicationDependencies() {
  return {
    ai: new OpenAIAiGateway(),
    embeddings: new OpenAIEmbeddingService(),
    products: new SupabaseProductRepository(),
    market: new SupabaseMarketRepository(),
    sessions: new SupabaseSessionRepository(),
    evidence: new SupabaseEvidenceRepository(),
  };
}