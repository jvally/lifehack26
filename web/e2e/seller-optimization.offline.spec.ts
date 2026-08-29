import { expect, test } from "@playwright/test";

test("seller improves a listing in the offline demo", async ({ page }) => {
  const simulationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/simulate")) {
      simulationRequests.push(request.url());
    }
  });

  await page.route("**/api/products", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            products: [
              {
                id: "cloudrun-pro",
                name: "CloudRun Pro",
                category: "running_shoes",
                description: "A lightweight and comfortable running shoe.",
                price: 179,
                currency: "SGD",
              },
            ],
          },
          requestId: "products-list-1",
        }),
      });
    }

    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: { productIds: ["cloudrun-pro"] },
        requestId: "import-1",
      }),
    });
  });

  await page.route("**/api/catalog/products/cloudrun-pro", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          id: "cloudrun-pro",
          name: "CloudRun Pro",
          category: "running_shoes",
          description: "A lightweight and comfortable running shoe.",
          price: 179,
          currency: "SGD",
          features: [
            {
              key: "weight",
              label: "Measured weight",
              value: 220,
              unit: "g",
            },
          ],
        },
        requestId: "catalog-detail-1",
      }),
    }),
  );

  await page.route("**/api/products/cloudrun-pro/extract", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {},
        requestId: "extract-1",
      }),
    }),
  );

  // 1. Verify homepage has "Browse catalogue" CTA and navigation
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Browse catalogue" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse catalogue" }).click();

  // 2. Verify catalogue page loads and has no seller internal metrics
  await expect(page).toHaveURL("/catalog");
  await expect(
    page.getByRole("heading", { name: "CloudRun Pro" }),
  ).toBeVisible();
  await expect(page.getByText("AI Readiness")).not.toBeVisible();

  // 3. Verify clicking a card opens detail page with product specifications
  await page.getByRole("link", { name: "View product" }).click();
  await expect(page).toHaveURL("/catalog/cloudrun-pro");
  await expect(
    page.getByRole("heading", { name: "CloudRun Pro" }),
  ).toBeVisible();
  await expect(page.getByText("Measured weight")).toBeVisible();
  await expect(page.getByText("220 g")).toBeVisible();

  // 4. Verify detail page has no seller info or internal metrics
  await expect(page.getByText("AI Readiness")).not.toBeVisible();
  await expect(page.getByText("Seller Coach")).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "One answer, more coverage" }),
  ).not.toBeVisible();

  // 5. Navigate to /products/new to continue seller flow
  await page.goto("/products/new");
  await page.getByLabel("Product listing").fill(
    "CloudRun Pro\nA lightweight and comfortable running shoe suitable for all runners.\nMade with premium materials. Price: S$179.",
  );
  await page.getByRole("button", { name: "Analyse listing" }).click();

  await expect(page.getByText(/Offline demo mode uses local sample data/)).toBeVisible();
  await expect(page.getByText("AI Readiness")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View product in catalogue" }),
  ).toBeVisible();
  const initialScore = Number(
    await page.getByTestId("readiness-total").textContent(),
  );

  await page.getByRole("button", { name: "Open seller coach" }).first().click();
  const coach = page.getByRole("region", {
    name: "RetailReady seller coach",
  });
  await expect(coach.getByText(/what is the measured weight/i)).toBeVisible();
  await coach.getByLabel("Your answer").fill("220");
  await coach
    .getByLabel("Supporting evidence")
    .fill("Specification sheet: CloudRun Pro weighs 220 g at men's US size 9.");
  await coach.getByRole("button", { name: "Save answer" }).click();
  await page.getByRole("button", { name: "Review 1 proposed change" }).click();
  await page.getByRole("button", { name: "Approve and save" }).click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Compare recommendations" }).click();
  await expect(page.getByRole("heading", { name: "Before" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After" })).toBeVisible();
  expect(simulationRequests).toEqual([]);

  const finalScore = Number(
    await page.getByTestId("readiness-total").textContent(),
  );
  expect(finalScore).toBeGreaterThan(initialScore);
});
