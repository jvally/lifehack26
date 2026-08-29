import type OpenAI from "openai";

import { getOpenAIClient } from "@/lib/openai";

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";

export interface EmbeddingService {
  embed(texts: string[]): Promise<number[][]>;
}

function assertEmbeddings(embeddings: number[][], expectedCount: number) {
  if (
    embeddings.length !== expectedCount ||
    embeddings.some(
      (embedding) =>
        embedding.length !== EMBEDDING_DIMENSIONS ||
        embedding.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error("EMBEDDING_RESPONSE_INVALID");
  }
}

export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(private readonly client: OpenAI = getOpenAIClient()) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    });
    const embeddings = [...response.data]
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
    assertEmbeddings(embeddings, texts.length);
    return embeddings;
  }
}

/** Deterministic fake vectors with useful cosine differences for RAG tests. */
export class FakeEmbeddingService implements EmbeddingService {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
      for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
        let hash = 2166136261;
        for (const character of token) {
          hash ^= character.charCodeAt(0);
          hash = Math.imul(hash, 16777619);
        }
        vector[Math.abs(hash) % EMBEDDING_DIMENSIONS] += 1;
      }
      const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
      return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
    });
  }
}
