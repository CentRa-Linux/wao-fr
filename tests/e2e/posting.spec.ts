import { test, expect } from "@playwright/test";
import { createTestUser, signInThroughUI } from "./utils/testUser";

test.describe("Timeline posting", () => {
  test("user can publish a public post", async ({ page }) => {
    const user = await createTestUser();
    await signInThroughUI(page, user);

    const composer = page.getByPlaceholder("What's happening?");
    const content = `Playwright post ${Date.now()}`;
    await composer.fill(content);

    const expectedRemaining = 280 - content.length;
    await expect(page.getByTestId("composer-char-counter")).toHaveText(String(expectedRemaining));

    await page.getByRole("button", { name: /^投稿$/ }).click();

    const postCard = page.getByTestId("post-card").filter({ hasText: content }).first();
    await expect(postCard).toBeVisible();
  });
});
