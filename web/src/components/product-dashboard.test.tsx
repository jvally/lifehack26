import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeMockDashboard } from "./mock-dashboard-data";
import { ProductDashboard } from "./product-dashboard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function apiResponse(data: unknown, status = 200, requestId = "request-1") {
  return new Response(JSON.stringify({ ok: status < 400, data, requestId }), {
    status,
  });
}

describe("ProductDashboard", () => {
  it("keeps the coach unavailable while the live evaluation is pending", async () => {
    const dashboard = makeMockDashboard("product-1");
    let finishEvaluation: ((response: Response) => void) | undefined;
    const evaluation = new Promise<Response>((resolve) => {
      finishEvaluation = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          apiResponse({
            passport: dashboard.passport,
            evaluation: dashboard.evaluation,
          }),
        )
        .mockReturnValueOnce(evaluation),
    );

    render(<ProductDashboard productId="product-1" />);

    expect(screen.getByText("Analysing listing…")).toBeInTheDocument();
    expect(screen.queryByText("CloudRun Pro")).not.toBeInTheDocument();

    finishEvaluation?.(
      apiResponse({
        evaluation: dashboard.evaluation,
        intelligence: dashboard.intelligence,
      }),
    );
    await screen.findAllByRole("button", { name: "Open seller coach" });
  });

  it("shows the API request ID instead of silently using mock data", async () => {
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
    expect(screen.queryByText("CloudRun Pro")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("uses the real session ID and next gap returned by the API", async () => {
    const dashboard = makeMockDashboard("product-1");
    const nextGap = dashboard.evaluation.gaps[1];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        apiResponse({
          passport: dashboard.passport,
          evaluation: dashboard.evaluation,
        }),
      )
      .mockResolvedValueOnce(
        apiResponse({
          evaluation: dashboard.evaluation,
          intelligence: dashboard.intelligence,
        }),
      )
      .mockResolvedValueOnce(
        apiResponse({ session: { id: "session-live-1" }, nextGap }, 201),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductDashboard productId="product-1" />);

    const coachButtons = await screen.findAllByRole("button", {
      name: "Open seller coach",
    });
    await userEvent.click(coachButtons[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/product-1/interviews",
        { method: "POST" },
      ),
    );
    const coach = await screen.findByRole("region", {
      name: "One answer, more coverage",
    });
    expect(within(coach).getByText(nextGap.question)).toBeInTheDocument();
    expect(within(coach).getByText(/Interview in progress/)).toBeInTheDocument();
  });

  it("uses mock data only when offline demo mode is explicit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductDashboard productId="product-1" offlineDemo />);

    expect(await screen.findByText("CloudRun Pro")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
