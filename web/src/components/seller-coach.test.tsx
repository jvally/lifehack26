import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearMockBrandDatabase,
  getMockBrandProduct,
} from "@/lib/mock-brand-database";
import { makeMockDashboard } from "./mock-dashboard-data";
import { SellerCoach } from "./seller-coach";

afterEach(() => {
  cleanup();
  clearMockBrandDatabase();
});

describe("SellerCoach", () => {
  it("stages answers, shows a proposal, and updates the mock database only after approval", async () => {
    const dashboard = makeMockDashboard("product-1");
    const onApproved = vi.fn();
    render(
      <SellerCoach
        productId="product-1"
        passport={dashboard.passport}
        evaluation={dashboard.evaluation}
        intelligence={dashboard.intelligence}
        offlineDemo
        onApproved={onApproved}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open seller coach" }));
    await userEvent.type(screen.getByLabelText("Your answer"), "220");
    await userEvent.type(
      screen.getByLabelText("Supporting evidence"),
      "Specification sheet: 220 g at men's US size 9.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));

    expect(getMockBrandProduct("product-1")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Review 1 proposed change" }),
    );
    expect(screen.getByText(/Not supplied/)).toHaveTextContent("220 g");

    await userEvent.click(screen.getByRole("button", { name: "Approve and save" }));

    expect(await screen.findByText("Approved catalog record saved")).toBeInTheDocument();
    expect(onApproved).toHaveBeenCalledWith(
      expect.objectContaining({ changedFeatureKeys: ["weight"] }),
    );
    expect(getMockBrandProduct("product-1")?.status).toBe("approved");
    expect(
      getMockBrandProduct("product-1")?.passport?.features.find(
        (feature) => feature.key === "weight",
      ),
    ).toMatchObject({ value: 220, status: "verified" });
  });
});
