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
    expect(within(passport).getAllByText("Weather suitability")).toHaveLength(2);

    await userEvent.type(weightInput, "220");
    expect(weightInput).toHaveValue("220");
    expect(within(passport).getAllByRole("button", { name: "Save" })).toHaveLength(5);
    await userEvent.click(within(passport).getAllByRole("button", { name: "Save" })[0]);
    expect(within(passport).getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(
      within(passport).queryByRole("button", { name: /show more/i }),
    ).not.toBeInTheDocument();
  });
});
