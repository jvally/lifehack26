import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogueProductDetail } from "./catalogue-product-detail";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatalogueProductDetail", () => {
  it("renders product detail and public features without internal metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              id: "cloudrun-pro",
              name: "CloudRun Pro",
              category: "running_shoes",
              description: "A lightweight and comfortable running shoe.",
              price: null,
              currency: "USD",
              features: [
                {
                  key: "weight",
                  label: "Measured weight",
                  value: 220,
                  unit: "g",
                },
                {
                  key: "price",
                  label: "Price",
                  value: 70,
                  unit: "USD",
                },
                {
                  key: "drop",
                  label: "Heel-to-toe drop",
                  value: 8,
                  unit: "mm",
                },
              ],
            },
            requestId: "req-detail-1",
          }),
          { status: 200 },
        ),
      ),
    );

    render(<CatalogueProductDetail productId="cloudrun-pro" />);

    expect(await screen.findByRole("heading", { name: "CloudRun Pro" })).toBeInTheDocument();
    expect(screen.getByText("A lightweight and comfortable running shoe.")).toBeInTheDocument();
    expect(screen.getByText("USD $70")).toBeInTheDocument();
    expect(screen.getByText("Running Shoes")).toBeInTheDocument();

    expect(screen.getByText("Measured weight")).toBeInTheDocument();
    expect(screen.getByText("220 g")).toBeInTheDocument();
    expect(screen.getByText("Heel-to-toe drop")).toBeInTheDocument();
    expect(screen.getByText("8 mm")).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back to catalogue/i });
    expect(backLink).toHaveAttribute("href", "/catalog");

    // Ensure NO internal metrics are present
    expect(screen.queryByText(/AI Readiness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Competitiveness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Seller Coach/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Proposed catalog changes/i)).not.toBeInTheDocument();
  });
});
