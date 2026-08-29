import { describe, expect, it } from "vitest";
import { makeMockDashboard } from "./mock-dashboard-data";

describe("makeMockDashboard", () => {
  it("extracts common currency formats from a listing", () => {
    expect(makeMockDashboard("product-1", "CloudRun Pro\n$60").passport.price).toBe(60);
    expect(makeMockDashboard("product-2", "CloudRun Pro\nPrice: SGD 79.90").passport.price).toBe(79.9);
  });

  it("keeps an unpriced listing unpriced for Product Truth to complete", () => {
    expect(makeMockDashboard("product-3", "CloudRun Pro\nLightweight running shoe").passport.price).toBeNull();
  });
});
