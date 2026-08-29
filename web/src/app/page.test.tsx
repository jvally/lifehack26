import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("introduces RET-AI-L Ready", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "RET-AI-L Ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /give every product the evidence it needs to answer an AI shopper/i,
      ),
    ).toBeInTheDocument();
  });
});
