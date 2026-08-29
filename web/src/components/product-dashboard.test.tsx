import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductDashboard } from "./product-dashboard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProductDashboard", () => {
  it("shows an error instead of silently using mock data when the product cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { message: "The product was not found." },
            requestId: "request-missing",
          }),
          { status: 404 },
        ),
      ),
    );

    render(<ProductDashboard productId="product-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The product was not found. Request ID: request-missing",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("uses mock data only when offline demo mode is explicit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductDashboard productId="product-1" offlineDemo />);

    expect(await screen.findByText("CloudRun Pro")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Open seller coach" }),
    ).toBeInTheDocument();
  });

  it("keeps short feature cards compact while allowing each field to be edited", async () => {
    render(<ProductDashboard productId="product-1" offlineDemo />);

    const passport = await screen.findByRole("region", { name: "CloudRun Pro" });
    const weightInput = within(passport).getByLabelText("Measured weight");
    expect(weightInput).toHaveAttribute("placeholder", "Enter measured weight");
    expect(within(passport).getAllByText("Distance suitability").length).toBeGreaterThan(0);
    expect(within(passport).queryByText("Weather suitability")).not.toBeInTheDocument();

    await userEvent.type(weightInput, "220");
    expect(weightInput).toHaveValue("220");
    expect(within(passport).getAllByRole("button", { name: "Save" })).toHaveLength(6);
    await userEvent.click(within(passport).getAllByRole("button", { name: "Save" })[0]);
    expect(within(passport).getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(
      within(passport).queryByRole("button", { name: /show more/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the dashboard focused on product truth, readiness, market context, and actions", async () => {
    render(<ProductDashboard productId="product-focused" offlineDemo />);

    expect(await screen.findByRole("region", { name: "CloudRun Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What shoppers ask for" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Highest-impact actions" })).toBeInTheDocument();
    expect(screen.queryByText("Recommendation proof")).not.toBeInTheDocument();
    expect(screen.queryByText("Visibility tracker")).not.toBeInTheDocument();
    expect(screen.queryByText("Implementation patch")).not.toBeInTheDocument();
  });

  it("recalculates readiness when a product truth specification is saved", async () => {
    render(<ProductDashboard productId="product-readiness" offlineDemo />);

    const passport = await screen.findByRole("region", { name: "CloudRun Pro" });
    const readiness = screen.getByTestId("readiness-total");
    const initialScore = Number(readiness.textContent);
    const weightInput = within(passport).getByLabelText("Measured weight");

    await userEvent.type(weightInput, "220");
    await userEvent.click(within(passport).getAllByRole("button", { name: "Save" })[0]);

    expect(await within(passport).findByText("Saved")).toBeInTheDocument();
    expect(Number(readiness.textContent)).toBeGreaterThan(initialScore);
  });
});
