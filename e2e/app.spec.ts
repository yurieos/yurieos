import { expect, test } from "@playwright/test";

test.describe("App functionality", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Yurie/);
  });

  test("should allow typing in the chat input", async ({ page }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Ask anything");
    await expect(input).toBeVisible();
    await input.fill("Hello world");
    await expect(input).toHaveValue("Hello world");
  });
});
