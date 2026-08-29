import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportListingForm } from "./import-listing-form";

afterEach(cleanup);

describe("ImportListingForm", () => {
  it("imports pasted listing text and starts extraction", async () => {
    const onImported = vi.fn();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { productIds: ["product-1"] }, requestId: "request-1" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: {}, requestId: "request-2" }), { status: 200 })));
    render(<ImportListingForm onImported={onImported} />);
    await userEvent.type(screen.getByLabelText("Product listing"), "CloudRun Pro lightweight shoe");
    await userEvent.click(screen.getByRole("button", { name: "Analyse listing" }));
    await waitFor(() => expect(fetch).toHaveBeenNthCalledWith(1, "/api/products", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(fetch).toHaveBeenNthCalledWith(2, "/api/products/product-1/extract", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith("product-1"));
  });

  it("shows the request ID when the import API rejects the listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { message: "The listing format is invalid." },
            requestId: "request-invalid",
          }),
          { status: 400 },
        ),
      ),
    );
    render(<ImportListingForm onImported={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Product listing"),
      "CloudRun Pro lightweight shoe",
    );
    await userEvent.click(screen.getByRole("button", { name: "Analyse listing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The listing format is invalid. Request ID: request-invalid",
    );
  });
});
