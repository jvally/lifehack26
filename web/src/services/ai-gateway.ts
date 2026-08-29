import { zodTextFormat } from "openai/helpers/zod";
import type OpenAI from "openai";
import { z } from "zod";

import { QueryIntentSchema, type QueryIntent } from "@/domain/market";
import {
  ProductPassportSchema,
  type ProductPassport,
} from "@/domain/passport";
import { getOpenAIClient } from "@/lib/openai";

export const RawProductInputSchema = z.object({
  externalId: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  rawListing: z.string().min(1),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  sourceType: z.enum(["text", "json", "csv"]).optional(),
});

export type RawProductInput = z.infer<typeof RawProductInputSchema>;

export const ProductPassportDraftSchema = ProductPassportSchema.omit({
  productId: true,
  updatedAt: true,
});

export type ProductPassportDraft = z.infer<
  typeof ProductPassportDraftSchema
>;

export const EvidenceVerdictSchema = z.object({
  supported: z.boolean(),
  supportingExcerpt: z.string().nullable(),
  rationale: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type EvidenceVerdict = z.infer<typeof EvidenceVerdictSchema>;

export interface AiGateway {
  extractProduct(input: RawProductInput): Promise<ProductPassportDraft>;
  parseQuery(query: string): Promise<QueryIntent>;
  verifyEvidence(input: {
    featureKey: string;
    value: ProductPassport["features"][number]["value"];
    evidenceText: string;
  }): Promise<EvidenceVerdict>;
}

type AiGatewayHandlers = {
  extractProduct: (input: RawProductInput) => Promise<ProductPassportDraft>;
  parseQuery: (query: string) => Promise<QueryIntent>;
  verifyEvidence: (input: {
    featureKey: string;
    value: ProductPassport["features"][number]["value"];
    evidenceText: string;
  }) => Promise<EvidenceVerdict>;
};

/** A configurable network-free gateway for service and integration tests. */
export class FakeAiGateway implements AiGateway {
  constructor(private readonly handlers: AiGatewayHandlers) {}

  extractProduct(input: RawProductInput) {
    return this.handlers.extractProduct(input);
  }

  parseQuery(query: string) {
    return this.handlers.parseQuery(query);
  }

  verifyEvidence(input: Parameters<AiGateway["verifyEvidence"]>[0]) {
    return this.handlers.verifyEvidence(input);
  }
}

async function retry<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

export class OpenAIAiGateway implements AiGateway {
  constructor(
    private readonly client: OpenAI = getOpenAIClient(),
    private readonly attempts = 3,
  ) {}

  async extractProduct(input: RawProductInput): Promise<ProductPassportDraft> {
    const product = RawProductInputSchema.parse(input);
    const parsed = await retry(async () => {
      const response = await this.client.responses.parse({
        model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "Extract only facts explicitly supported by the seller listing. Use ai_inferred for extracted facts. Represent absent values as null with missing status. Never copy competitor observations into this seller's claims.",
          },
          { role: "user", content: JSON.stringify(product) },
        ],
        text: {
          format: zodTextFormat(ProductPassportDraftSchema, "product_passport"),
        },
      });
      if (!response.output_parsed) {
        throw new Error("AI_PRODUCT_EXTRACTION_EMPTY");
      }
      return ProductPassportDraftSchema.parse(response.output_parsed);
    }, this.attempts);
    return parsed;
  }

  async parseQuery(query: string): Promise<QueryIntent> {
    if (!query.trim()) {
      throw new Error("AI_QUERY_EMPTY");
    }
    return retry(async () => {
      const response = await this.client.responses.parse({
        model: process.env.OPENAI_QUERY_MODEL ?? "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "Convert the shopping request into normalized intent. Put non-negotiable requirements in hardConstraints and softer wishes in preferences. Do not invent constraints.",
          },
          { role: "user", content: query },
        ],
        text: { format: zodTextFormat(QueryIntentSchema, "shopping_intent") },
      });
      if (!response.output_parsed) {
        throw new Error("AI_QUERY_PARSE_EMPTY");
      }
      return QueryIntentSchema.parse(response.output_parsed);
    }, this.attempts);
  }

  async verifyEvidence(
    input: Parameters<AiGateway["verifyEvidence"]>[0],
  ): Promise<EvidenceVerdict> {
    if (!input.evidenceText.trim()) {
      throw new Error("AI_EVIDENCE_TEXT_EMPTY");
    }
    return retry(async () => {
      const response = await this.client.responses.parse({
        model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-5-mini",
        input: [
          {
            role: "system",
            content:
              "Decide whether this seller-supplied evidence explicitly supports the claimed feature value. Merely related language is insufficient. Quote only a short supporting excerpt and return calibrated confidence.",
          },
          { role: "user", content: JSON.stringify(input) },
        ],
        text: {
          format: zodTextFormat(EvidenceVerdictSchema, "evidence_verdict"),
        },
      });
      if (!response.output_parsed) {
        throw new Error("AI_EVIDENCE_VERIFICATION_EMPTY");
      }
      return EvidenceVerdictSchema.parse(response.output_parsed);
    }, this.attempts);
  }
}
