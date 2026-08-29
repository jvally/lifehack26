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
    render(<BeforeAfterPanel productId="product-1" offlineDemo />);

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
    render(<BeforeAfterPanel productId="product-1" offlineDemo={false} />);
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
});
