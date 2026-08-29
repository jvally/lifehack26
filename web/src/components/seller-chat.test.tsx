import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SellerChat } from "./seller-chat";

afterEach(cleanup);

const weightGap = {
  featureKey: "weight",
  label: "Measured weight",
  reason: "missing" as const,
  priority: 90,
  question: "What is the measured weight?",
  evidenceRequested: true,
};

const weightDefinition = {
  key: "weight",
  label: "Measured weight",
  dataType: "number" as const,
  unit: "g",
  required: true,
  demandWeight: 1,
  constraintImportance: 1,
  competitiveCoverage: 1,
  competitiveDirection: "lower" as const,
  answerability: 1,
  evidenceRequired: true,
  synonyms: [],
};

describe("SellerChat", () => {
  it("submits a seller answer and supporting evidence", async () => {
    const onUpdate = vi.fn();
    render(<SellerChat sessionId="session-1" gap={weightGap} definition={weightDefinition} onUpdate={onUpdate} />);
    await userEvent.type(screen.getByLabelText("Your answer"), "220");
    await userEvent.type(screen.getByLabelText("Supporting evidence"), "Specification sheet: 220 g at men's US 9.");
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 220, evidenceText: expect.stringContaining("220 g") })));
  });

  it("shows the request ID returned when an answer cannot be saved", async () => {
    const onUpdate = vi
      .fn()
      .mockRejectedValue(
        new Error("The answer was rejected. Request ID: request-answer"),
      );
    render(
      <SellerChat
        sessionId="session-1"
        gap={weightGap}
        definition={weightDefinition}
        onUpdate={onUpdate}
      />,
    );

    await userEvent.type(screen.getByLabelText("Your answer"), "220");
    await userEvent.click(screen.getByRole("button", { name: "Save answer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The answer was rejected. Request ID: request-answer",
    );
    expect(screen.getByLabelText("Your answer")).toHaveValue(220);
  });

  it("clears the previous answer when the coach advances to a new gap", async () => {
    const { rerender } = render(
      <SellerChat
        sessionId="session-1"
        gap={weightGap}
        definition={weightDefinition}
        onUpdate={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText("Your answer"), "220");

    rerender(
      <SellerChat
        sessionId="session-1"
        gap={{
          featureKey: "terrain",
          label: "Terrain",
          reason: "missing",
          priority: 80,
          question: "Which terrain is supported?",
          evidenceRequested: false,
        }}
        definition={{
          ...weightDefinition,
          key: "terrain",
          label: "Terrain",
          dataType: "string",
          unit: null,
        }}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });
});
