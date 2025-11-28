import { test, expect } from "@playwright/test";
import { createPostForUser, createTestUser, signInThroughUI } from "./utils/testUser";

test.describe("Private accounts", () => {
  test("following a private profile requires approval", async ({ page }) => {
    const privateUser = await createTestUser({ isPrivate: true });
    await createPostForUser(privateUser, "Secret followers-only post", "followers");

    const fanUser = await createTestUser();
    await signInThroughUI(page, fanUser);

    await page.goto(`/profile/${privateUser.uniqueId}`);

    await expect(page.getByText("非公開アカウント")).toBeVisible();
    await expect(page.getByText("このアカウントは非公開です。フォローが承認されると投稿を閲覧できます。")).toBeVisible();

    await page.getByRole("button", { name: "フォロー" }).click();

    await expect(page.getByRole("button", { name: "申請を取り消す" })).toBeVisible();
    await expect(page.getByText("フォロー申請は承認待ちです")).toBeVisible();
  });
});
