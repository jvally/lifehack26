import type { ListingEvaluation } from "@/domain/evaluation";
import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";

export type RawProductInput = {
  externalId: string | null;
  name: string;
  category: string;
  rawListing: string;
  price: number | null;
  currency: string | null;
  sourceType: "text" | "json" | "csv" | "challenge_database";
};

export type ProductRecord = RawProductInput & {
  id: string;
  passport: ProductPassport | null;
  originalPassport: ProductPassport | null;
  evaluation: ListingEvaluation | null;
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
};

export type InterviewMessage = {
  id: string;
  role: "assistant" | "seller";
  content: string;
  featureKey: string | null;
  createdAt: string;
};

export type InterviewSession = {
  id: string;
  productId: string;
  askedFeatureKeys: string[];
  messages: InterviewMessage[];
  createdAt: string;
};

export interface ProductRepository {
  create(input: RawProductInput): Promise<ProductRecord>;
  createMany(inputs: RawProductInput[]): Promise<ProductRecord[]>;
  get(productId: string): Promise<ProductRecord | null>;
  listByCategory(category: string): Promise<ProductRecord[]>;
  savePassport(productId: string, passport: ProductPassport): Promise<void>;
  saveEmbedding(productId: string, embedding: number[]): Promise<void>;
  searchByEmbedding(
    category: string,
    embedding: number[],
    limit: number,
  ): Promise<Array<ProductRecord & { similarity: number }>>;
  saveEvaluation(
    productId: string,
    evaluation: ListingEvaluation,
  ): Promise<void>;
}

export interface MarketRepository {
  saveSignals(signals: MarketSignal[], embeddings: number[][]): Promise<void>;
  retrieve(
    category: string,
    query: string,
    embedding: number[],
    limit: number,
  ): Promise<MarketSignal[]>;
}

export interface SessionRepository {
  create(productId: string): Promise<InterviewSession>;
  get(sessionId: string): Promise<InterviewSession | null>;
  appendMessage(
    sessionId: string,
    message: InterviewMessage,
  ): Promise<void>;
  markAsked(sessionId: string, featureKey: string): Promise<void>;
}

export type EvidenceRecord = {
  id: string;
  productId: string;
  featureKey: string;
  originalName: string | null;
  mediaType: string;
  storagePath: string | null;
  extractedText: string;
  supported: boolean;
  supportingExcerpt: string | null;
  createdAt: string;
};

export interface EvidenceRepository {
  create(
    input: Omit<EvidenceRecord, "id" | "createdAt">,
  ): Promise<EvidenceRecord>;
  listForProduct(productId: string): Promise<EvidenceRecord[]>;
}
