import { expect, test } from "@playwright/test";

test.skip(
  process.env.PLAYWRIGHT_MODE !== "live",
  "Live release credentials are required.",
);

test("seller completes the real API optimization journey", async ({ page }) => {
  await page.goto("/products/new");
  await page.getByLabel("Product listing").fill(
    "CloudRun Pro\nCategory: running shoes\nPrice: S$179\nDesigned for road running and half marathon training. Each shoe weighs 220 g at men's US size 9. The ventilated mesh upper supports humid-weather running. Specification source: manufacturer product sheet.",
  );
  await page.getByRole("button", { name: "Analyse listing" }).click();

  await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}$/i);
  const productId = page.url().split("/").pop();
  expect(productId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.getByText("AI Readiness")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Open seller coach" }).first().click();
  const coach = page.getByRole("region", {
    name: "One answer, more coverage",
  });
  const question = await coach.locator("p").nth(1).textContent();
  const answer = coach.getByLabel("Your answer");
  const tagName = await answer.evaluate((element) => element.tagName);
  if (tagName === "SELECT") {
    await answer.selectOption({ index: 1 });
  } else if ((await answer.getAttribute("type")) === "number") {
    await answer.fill("220");
  } else {
    await answer.fill("Road running");
  }

  const evidence = coach.getByLabel("Supporting evidence");
  if (await evidence.isVisible()) {
    await evidence.fill("Manufacturer specification sheet supplied by seller.");
  }
  await coach.getByRole("button", { name: "Save answer" }).click();
  if (question) await expect(coach).not.toContainText(question);

  await page.getByRole("button", { name: "Compare recommendations" }).click();
  await expect(page.getByRole("heading", { name: "Before" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After" })).toBeVisible();

  const exported = await page.request.get(`/api/products/${productId}/export`);
  expect(exported.ok()).toBe(true);
  expect(exported.headers()["content-disposition"]).toContain(
    "product-passport.json",
  );
});
