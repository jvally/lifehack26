import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BeforeAfterPanel } from "./before-after-panel";
import { makeMockRecommendation } from "./mock-dashboard-data";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BeforeAfterPanel", () => {
  it("uses local recommendation data only in explicit offline mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<BeforeAfterPanel productId="cloudrun-pro" offlineDemo />);

    await userEvent.click(
      screen.getByRole("button", { name: "Compare recommendations" }),
    );

    expect(await screen.findByText("Eligible")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes stale results and shows the request ID after a live API error", async () => {
    const query =
      "I am training for a half marathon in Singapore's humid weather and need lightweight road shoes under S$200.";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              data: {
                targetProductId: "cloudrun-pro",
                before: makeMockRecommendation(query, false),
                after: makeMockRecommendation(query, true),
              },
              requestId: "request-success",
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: false,
              error: { message: "Simulation is unavailable." },
              requestId: "request-simulation",
            }),
            { status: 503 },
          ),
        ),
    );
    render(<BeforeAfterPanel productId="cloudrun-pro" offlineDemo={false} />);
    const compare = screen.getByRole("button", {
      name: "Compare recommendations",
    });

    await userEvent.click(compare);
    expect(await screen.findByText("Eligible")).toBeInTheDocument();
    await userEvent.click(compare);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Simulation is unavailable. Request ID: request-simulation",
    );
    expect(screen.queryByText("Eligible")).not.toBeInTheDocument();
  });

  it("renders the target product even when a competitor is first in the result array", async () => {
    const query = "Road running shoes under S$200";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              targetProductId: "product-cloudrun",
              before: {
                query,
                intent: {
                  category: "running_shoes",
                  goal: "road running",
                  hardConstraints: { price_max: 200 },
                  preferences: [],
                  contexts: [],
                },
                candidates: [
                  {
                    productId: "product-roadline",
                    productName: "Roadline Elite",
                    eligible: true,
                    rank: 1,
                    fitScore: 90,
                    matchedFacts: ["road"],
                    failedConstraints: [],
                    missingEvidence: [],
                  },
                  {
                    productId: "product-cloudrun",
                    productName: "CloudRun Pro",
                    eligible: false,
                    rank: null,
                    fitScore: 20,
                    matchedFacts: [],
                    failedConstraints: [],
                    missingEvidence: ["terrain"],
                  },
                ],
                scoringVersion: "1.0.0",
              },
              after: {
                query,
                intent: {
                  category: "running_shoes",
                  goal: "road running",
                  hardConstraints: { price_max: 200 },
                  preferences: [],
                  contexts: [],
                },
                candidates: [
                  {
                    productId: "product-roadline",
                    productName: "Roadline Elite",
                    eligible: true,
                    rank: 2,
                    fitScore: 90,
                    matchedFacts: ["road"],
                    failedConstraints: [],
                    missingEvidence: [],
                  },
                  {
                    productId: "product-cloudrun",
                    productName: "CloudRun Pro",
                    eligible: true,
                    rank: 1,
                    fitScore: 88,
                    matchedFacts: ["road", "price"],
                    failedConstraints: [],
                    missingEvidence: [],
                  },
                ],
                scoringVersion: "1.0.0",
              },
            },
            requestId: "request-simulation",
          }),
          { status: 200 },
        ),
      ),
    );

    render(<BeforeAfterPanel productId="product-cloudrun" offlineDemo={false} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Compare recommendations" }),
    );

    expect(await screen.findAllByText(/Target product: CloudRun Pro/)).toHaveLength(2);
    expect(screen.getAllByText("Ranked candidates")).toHaveLength(2);
    expect(screen.getAllByText(/Roadline Elite/).length).toBeGreaterThan(0);
  });
});
