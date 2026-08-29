import { expect, test } from "@playwright/test";

test("seller improves a listing and recommendation outcome", async ({ page }) => {
  await page.route("**/api/products", async (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, data: { productIds: ["cloudrun-pro"] }, requestId: "import-1" }) }));
  await page.route("**/api/products/cloudrun-pro/extract", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: {}, requestId: "extract-1" }) }));
  await page.route("**/api/products/cloudrun-pro/simulate", async (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false }) }));
  await page.goto("/products/new");
  await page.getByLabel("Product listing").fill("CloudRun Pro\nA lightweight and comfortable running shoe suitable for all runners.\nMade with premium materials. Price: S$179.");
  await page.getByRole("button", { name: "Analyse listing" }).click();
  await expect(page.getByText("AI Readiness")).toBeVisible();
  const initialScore = Number(await page.getByTestId("readiness-total").textContent());
  await page.getByRole("button", { name: "Open seller coach" }).first().click();
  await expect(page.getByText(/measured weight/i)).toBeVisible();
  await page.getByLabel("Your answer").fill("220");
  await page.getByLabel("Supporting evidence").fill("Specification sheet: CloudRun Pro weighs 220 g at men's US size 9.");
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByText("Verified")).toBeVisible();
  await page.getByRole("button", { name: "Compare recommendations" }).click();
  await expect(page.getByRole("heading", { name: "Before" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After" })).toBeVisible();
  const finalScore = Number(await page.getByTestId("readiness-total").textContent());
  expect(finalScore).toBeGreaterThan(initialScore);
});
