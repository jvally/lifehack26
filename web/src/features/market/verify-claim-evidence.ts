import type { MarketSignal } from "@/domain/market";
import type { ProductPassport } from "@/domain/passport";
import type { AiGateway, EvidenceVerdict } from "@/services/ai-gateway";

export type ClaimEvidence =
  | { kind: "seller_evidence"; text: string }
  | { kind: "market_signal"; signal: MarketSignal };

/**
 * Market observations are context and citations, never proof of this seller's
 * product claims. Only seller-supplied evidence is sent to the AI verifier.
 */
export async function verifyClaimEvidence(
  claim: {
    featureKey: string;
    value: ProductPassport["features"][number]["value"];
  },
  evidence: ClaimEvidence,
  ai: AiGateway,
): Promise<EvidenceVerdict> {
  if (evidence.kind === "market_signal") {
    return {
      supported: false,
      supportingExcerpt: null,
      rationale: `Market signal ${evidence.signal.id} is contextual evidence and cannot verify a seller claim.`,
      confidence: 1,
    };
  }
  if (!evidence.text.trim()) {
    return {
      supported: false,
      supportingExcerpt: null,
      rationale: "Seller evidence is empty.",
      confidence: 1,
    };
  }
  return ai.verifyEvidence({ ...claim, evidenceText: evidence.text });
}
