import "server-only";
import { OpenAIAiGateway } from "./ai-gateway";
import { OpenAIEmbeddingService } from "./embeddings";
import { SupabaseEvidenceRepository } from "./repositories/supabase-evidence-repository";
import { SupabaseMarketRepository } from "./repositories/supabase-market-repository";
import { SupabaseProductRepository } from "./repositories/supabase-product-repository";
import { SupabaseSessionRepository } from "./repositories/supabase-session-repository";
import { SupabaseAttributionRepository } from "./repositories/supabase-attribution-repository";

function createApplicationDependencies() {
  return {
    ai: new OpenAIAiGateway(),
    embeddings: new OpenAIEmbeddingService(),
    products: new SupabaseProductRepository(),
    market: new SupabaseMarketRepository(),
    sessions: new SupabaseSessionRepository(),
    evidence: new SupabaseEvidenceRepository(),
    attribution: new SupabaseAttributionRepository(),
  };
}

export type ApplicationDependencies = ReturnType<
  typeof createApplicationDependencies
>;

let applicationDependencies: ApplicationDependencies | null = null;

export function getApplicationDependencies(): ApplicationDependencies {
  applicationDependencies ??= createApplicationDependencies();
  return applicationDependencies;
}
