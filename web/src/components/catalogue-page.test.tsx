import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CataloguePage } from "./catalogue-page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CataloguePage", () => {
  it("renders catalogue cards and does not contain internal metrics like AI Readiness", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              products: [
                {
                  id: "cloudrun-pro",
                  name: "CloudRun Pro",
                  category: "running_shoes",
                  description: "Lightweight shoe for road running.",
                  price: 179,
                  currency: "SGD",
                },
                {
                  id: "aerostride-elite",
                  name: "AeroStride Elite",
                  category: "running_shoes",
                  description: "Carbon-plated marathon racing shoe.",
                  price: 249,
                  currency: "SGD",
                },
              ],
            },
            requestId: "req-1",
          }),
          { status: 200 },
        ),
      ),
    );

    render(<CataloguePage />);

    expect(await screen.findByRole("heading", { name: "CloudRun Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AeroStride Elite" })).toBeInTheDocument();
    expect(screen.getByText("Lightweight shoe for road running.")).toBeInTheDocument();
    expect(screen.getByText("SGD $179")).toBeInTheDocument();
    expect(screen.getByText("SGD $249")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: "View product" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/catalog/cloudrun-pro");
    expect(links[1]).toHaveAttribute("href", "/catalog/aerostride-elite");

    // Ensure NO internal metrics are displayed
    expect(screen.queryByText(/AI Readiness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Competitiveness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Seller Coach/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Recommendation readiness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gaps/i)).not.toBeInTheDocument();
  });

  it("renders an empty state when no products are returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: { products: [] },
            requestId: "req-empty",
          }),
          { status: 200 },
        ),
      ),
    );

    render(<CataloguePage />);

    expect(await screen.findByText("No products found")).toBeInTheDocument();
    expect(
      screen.getByText("There are no products available in the catalogue right now."),
    ).toBeInTheDocument();
  });

  it("handles errors and supports retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { message: "Failed to connect to database." },
            requestId: "req-err",
          }),
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              products: [
                {
                  id: "cloudrun-pro",
                  name: "CloudRun Pro",
                  category: "running_shoes",
                  description: "Lightweight shoe.",
                  price: 179,
                  currency: "SGD",
                },
              ],
            },
            requestId: "req-2",
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<CataloguePage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Failed to connect to database/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "CloudRun Pro" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
