import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeMockDashboard } from "./mock-dashboard-data";
import { ProductDashboard } from "./product-dashboard";

describe("ProductDashboard", () => {
  it("uses the real interview session id returned by the API", async () => {
    const dashboard = makeMockDashboard("product-1");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { passport: dashboard.passport, evaluation: dashboard.evaluation } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { evaluation: dashboard.evaluation, intelligence: dashboard.intelligence } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { session: { id: "session-live-1" }, nextGap: dashboard.evaluation.gaps[1] } }), { status: 201 })));
    render(<ProductDashboard productId="product-1" />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getAllByRole("button", { name: "Open seller coach" })[0]);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/products/product-1/interviews", { method: "POST" }));
    expect(screen.getAllByText(dashboard.evaluation.gaps[1].question)).not.toHaveLength(0);
  });
});
