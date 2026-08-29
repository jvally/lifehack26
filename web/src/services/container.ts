import "server-only";
import {
  applicationServices,
  type ApplicationServices,
} from "./application";
import type {
  MarketRepository,
  ProductRepository,
  SessionRepository,
} from "./repositories/contracts";
import {
  InMemoryMarketRepository,
  InMemoryProductRepository,
  InMemorySessionRepository,
} from "./repositories/in-memory";
import { SupabaseMarketRepository } from "./repositories/supabase-market-repository";
import { SupabaseProductRepository } from "./repositories/supabase-product-repository";
import { SupabaseSessionRepository } from "./repositories/supabase-session-repository";

export type ApplicationDependencies = {
  products: ProductRepository;
  market: MarketRepository;
  sessions: SessionRepository;
  application: ApplicationServices;
};

const memoryDependencies: ApplicationDependencies = {
  products: new InMemoryProductRepository(),
  market: new InMemoryMarketRepository(),
  sessions: new InMemorySessionRepository(),
  application: applicationServices,
};

let supabaseDependencies: ApplicationDependencies | null = null;

function shouldUseMemory(): boolean {
  return process.env.NODE_ENV === "test";
}

export function getApplicationDependencies(): ApplicationDependencies {
  if (shouldUseMemory()) return memoryDependencies;
  supabaseDependencies ??= {
    products: new SupabaseProductRepository(),
    market: new SupabaseMarketRepository(),
    sessions: new SupabaseSessionRepository(),
    application: applicationServices,
  };
  return supabaseDependencies;
}
