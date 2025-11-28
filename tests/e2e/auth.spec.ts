import { test, expect } from "@playwright/test";
import { createTestUser, logoutThroughUI, signInThroughUI } from "./utils/testUser";

test.describe("Authentication", () => {
  test("user can sign in and log out", async ({ page }) => {
    const user = await createTestUser();

    await signInThroughUI(page, user);

    await expect(page.getByRole("button", { name: new RegExp(`@${user.uniqueId}`, "i") })).toBeVisible();

    await logoutThroughUI(page, user.uniqueId);

    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });
});
