import { test, expect } from "@playwright/test";
import { createTestUser, signInThroughUI } from "./utils/testUser";

test.describe("Direct messages", () => {
  test("user can start a DM thread, send emoji, and see it in inbox", async ({ page }) => {
    const sender = await createTestUser();
    const recipient = await createTestUser();

    await signInThroughUI(page, sender);
    await page.goto(`/profile/${recipient.uniqueId}`);

    await expect(page.getByRole("button", { name: "メッセージ" })).toBeVisible();
    await page.getByRole("button", { name: "メッセージ" }).click();
    await page.waitForURL(`**/messages/${recipient.uniqueId}`);

    const messageText = `Playwright DM ${Date.now()}`;
    await page.getByPlaceholder("メッセージを入力...").fill(messageText);
    await page.getByRole("button", { name: "送信" }).click();

    await expect(page.getByTestId("dm-message").last()).toContainText(messageText);

    await page.getByRole("button", { name: "😊" }).first().click();
    await page.getByRole("button", { name: "😀" }).first().click();
    await expect(page.getByPlaceholder("メッセージを入力...")).toHaveValue("😀");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByTestId("dm-message").last()).toContainText("😀");

    await page.goto("/messages");
    const conversationLink = page.locator(`a[href="/messages/${recipient.uniqueId}"]`).first();
    await expect(conversationLink).toContainText(recipient.name);
    await expect(conversationLink).toContainText("😀");
  });

  test("message button is hidden when recipient disables DM", async ({ page }) => {
    const dmClosedUser = await createTestUser({ dmEnabled: false });
    const viewer = await createTestUser();

    await signInThroughUI(page, viewer);
    await page.goto(`/profile/${dmClosedUser.uniqueId}`);

    await expect(page.getByRole("button", { name: "メッセージ" })).toHaveCount(0);
  });
});
