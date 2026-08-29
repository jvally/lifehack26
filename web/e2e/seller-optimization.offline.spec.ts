import { expect, test } from "@playwright/test";

test("seller improves a listing in the offline demo", async ({ page }) => {
  const simulationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/simulate")) {
      simulationRequests.push(request.url());
    }
  });
  await page.route("**/api/products", async (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: { productIds: ["cloudrun-pro"] },
        requestId: "import-1",
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

  await page.goto("/products/new");
  await page.getByLabel("Product listing").fill(
    "CloudRun Pro\nA lightweight and comfortable running shoe suitable for all runners.\nMade with premium materials. Price: S$179.",
  );
  await page.getByRole("button", { name: "Analyse listing" }).click();

  await expect(page.getByText(/Offline demo mode uses local sample data/)).toBeVisible();
  await expect(page.getByText("AI Readiness")).toBeVisible();
  const initialScore = Number(
    await page.getByTestId("readiness-total").textContent(),
  );

  await page.getByRole("button", { name: "Open seller coach" }).first().click();
  const coach = page.getByRole("region", {
    name: "One answer, more coverage",
  });
  await expect(coach.getByText(/what is the measured weight/i)).toBeVisible();
  await coach.getByLabel("Your answer").fill("220");
  await coach
    .getByLabel("Supporting evidence")
    .fill("Specification sheet: CloudRun Pro weighs 220 g at men's US size 9.");
  await coach.getByRole("button", { name: "Save answer" }).click();
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
