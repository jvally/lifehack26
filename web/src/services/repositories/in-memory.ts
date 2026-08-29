import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type {
  InterviewMessage,
  InterviewSession,
  MarketRepository,
  ProductRecord,
  ProductRepository,
  RawProductInput,
  SessionRepository,
} from "./contracts";

const EMBEDDING_DIMENSIONS = 1536;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertEmbedding(embedding: number[], errorCode: string): void {
  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(errorCode);
  }
}

export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, ProductRecord>();

  async create(input: RawProductInput): Promise<ProductRecord> {
    return (await this.createMany([input]))[0];
  }

  async createMany(inputs: RawProductInput[]): Promise<ProductRecord[]> {
    const existingExternalIds = new Set(
      [...this.products.values()].flatMap((product) =>
        product.externalId === null ? [] : [product.externalId],
      ),
    );
    const batchExternalIds = new Set<string>();
    for (const input of inputs) {
      if (
        input.externalId !== null &&
        (existingExternalIds.has(input.externalId) ||
          batchExternalIds.has(input.externalId))
      ) {
        throw new Error("PRODUCT_EXTERNAL_ID_DUPLICATE");
      }
      if (input.externalId !== null) batchExternalIds.add(input.externalId);
    }

    const timestamp = new Date().toISOString();
    const records = inputs.map<ProductRecord>((input) => ({
      ...clone(input),
      id: crypto.randomUUID(),
      passport: null,
      originalPassport: null,
      evaluation: null,
      embedding: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    records.forEach((record) => this.products.set(record.id, clone(record)));
    return records.map(clone);
  }

  async get(productId: string): Promise<ProductRecord | null> {
    const record = this.products.get(productId);
    return record ? clone(record) : null;
  }

  async listByCategory(category: string): Promise<ProductRecord[]> {
    return [...this.products.values()]
      .filter((product) => product.category === category)
      .map(clone);
  }

  async savePassport(
    productId: string,
    passport: ProductPassport,
  ): Promise<void> {
    const product = this.requireProduct(productId);
    if (product.originalPassport === null) {
      product.originalPassport = clone(passport);
    }
    product.passport = clone(passport);
    product.updatedAt = new Date().toISOString();
  }

  async saveEmbedding(productId: string, embedding: number[]): Promise<void> {
    assertEmbedding(embedding, "PRODUCT_EMBEDDING_DIMENSION_INVALID");
    const product = this.requireProduct(productId);
    product.embedding = clone(embedding);
    product.updatedAt = new Date().toISOString();
  }

  async searchByEmbedding(
    category: string,
    embedding: number[],
    limit: number,
  ): Promise<Array<ProductRecord & { similarity: number }>> {
    assertEmbedding(embedding, "PRODUCT_EMBEDDING_DIMENSION_INVALID");
    return [...this.products.values()]
      .filter(
        (product) => product.category === category && product.embedding !== null,
      )
      .slice(0, Math.max(0, limit))
      .map((product) => ({ ...clone(product), similarity: 0.5 }));
  }

  async saveEvaluation(
    productId: string,
    evaluation: NonNullable<ProductRecord["evaluation"]>,
  ): Promise<void> {
    const product = this.requireProduct(productId);
    product.evaluation = clone(evaluation);
    product.updatedAt = new Date().toISOString();
  }

  private requireProduct(productId: string): ProductRecord {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    return product;
  }
}

type StoredSignal = {
  signal: MarketSignal;
  embedding: number[];
};

export class InMemoryMarketRepository implements MarketRepository {
  private readonly signals = new Map<string, StoredSignal>();

  async saveSignals(
    signals: MarketSignal[],
    embeddings: number[][],
  ): Promise<void> {
    if (signals.length !== embeddings.length) {
      throw new Error("MARKET_SIGNAL_EMBEDDING_COUNT_MISMATCH");
    }
    signals.forEach((signal, index) => {
      assertEmbedding(embeddings[index], "MARKET_EMBEDDING_DIMENSION_INVALID");
      this.signals.set(signal.id, {
        signal: clone(signal),
        embedding: clone(embeddings[index]),
      });
    });
  }

  async retrieve(
    category: string,
    _query: string,
    embedding: number[],
    limit: number,
  ): Promise<MarketSignal[]> {
    assertEmbedding(embedding, "MARKET_EMBEDDING_DIMENSION_INVALID");
    return [...this.signals.values()]
      .filter(({ signal }) => signal.category === category)
      .slice(0, Math.max(0, limit))
      .map(({ signal }) => clone(signal));
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, InterviewSession>();

  async create(productId: string): Promise<InterviewSession> {
    const session: InterviewSession = {
      id: crypto.randomUUID(),
      productId,
      askedFeatureKeys: [],
      messages: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, clone(session));
    return clone(session);
  }

  async get(sessionId: string): Promise<InterviewSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? clone(session) : null;
  }

  async appendMessage(
    sessionId: string,
    message: InterviewMessage,
  ): Promise<void> {
    this.requireSession(sessionId).messages.push(clone(message));
  }

  async markAsked(sessionId: string, featureKey: string): Promise<void> {
    const session = this.requireSession(sessionId);
    if (!session.askedFeatureKeys.includes(featureKey)) {
      session.askedFeatureKeys.push(featureKey);
    }
  }

  private requireSession(sessionId: string): InterviewSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("INTERVIEW_SESSION_NOT_FOUND");
    }
    return session;
  }
}
