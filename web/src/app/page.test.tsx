import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("introduces AgentReady Coach", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "AgentReady Coach" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /give every product the evidence it needs to answer an AI shopper/i,
      ),
    ).toBeInTheDocument();
  });
});
