import { describe, expect, it, vi } from "vitest";

import rawSignals from "@/data/demo-market-signals.json";
import { MarketSignalSchema } from "@/domain/market";
import { FakeAiGateway } from "@/services/ai-gateway";

import { verifyClaimEvidence } from "./verify-claim-evidence";

describe("verifyClaimEvidence", () => {
  it("never promotes a competitor observation into a seller claim", async () => {
    const verifyEvidence = vi.fn();
    const ai = new FakeAiGateway({
      async extractProduct() {
        throw new Error("unused");
      },
      async parseQuery() {
        throw new Error("unused");
      },
      verifyEvidence,
    });
    const signal = MarketSignalSchema.parse(rawSignals[2]);
    const verdict = await verifyClaimEvidence(
      { featureKey: "weight", value: 245 },
      { kind: "market_signal", signal },
      ai,
    );
    expect(verdict.supported).toBe(false);
    expect(verifyEvidence).not.toHaveBeenCalled();
  });
});
