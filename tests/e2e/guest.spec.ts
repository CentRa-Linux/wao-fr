import { test, expect } from "@playwright/test";

test.describe("Guest experience", () => {
  test("guest sees limited timeline view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    await expect(page.getByText("ログインすると投稿やリアクションができます。")).toBeVisible();
    await expect(page.getByPlaceholder("What's happening?")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });
});
