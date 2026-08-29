import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SellerChat } from "./seller-chat";

describe("SellerChat", () => {
  it("submits a seller answer and supporting evidence", async () => {
    const onUpdate = vi.fn();
    render(<SellerChat sessionId="session-1" gap={{ featureKey: "weight", label: "Measured weight", reason: "missing", priority: 90, question: "What is the measured weight?", evidenceRequested: true }} definition={{ key: "weight", label: "Measured weight", dataType: "number", unit: "g", required: true, demandWeight: 1, constraintImportance: 1, competitiveCoverage: 1, competitiveDirection: "lower", answerability: 1, evidenceRequired: true, synonyms: [] }} onUpdate={onUpdate} />);
    await userEvent.type(screen.getByLabelText("Your answer"), "220");
    await userEvent.type(screen.getByLabelText("Supporting evidence"), "Specification sheet: 220 g at men's US 9.");
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 220, evidenceText: expect.stringContaining("220 g") })));
  });
});
