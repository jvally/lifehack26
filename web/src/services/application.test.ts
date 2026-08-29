import { describe, expect, it } from "vitest";
import { getRequiredApplicationServices } from "./application";

describe("application service composition", () => {
  it("fails before callers can write when role services are not configured", () => {
    expect(() => getRequiredApplicationServices()).toThrow(
      "The application service has not been connected yet.",
    );
  });
});
