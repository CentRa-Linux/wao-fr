import { expect, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const API_BASE_URL = process.env.E2E_API_URL || "http://localhost:8080";

type CreateUserOptions = {
  isPrivate?: boolean;
  dmEnabled?: boolean;
};

export type TestUser = {
  email: string;
  password: string;
  uniqueId: string;
  name: string;
  accessToken: string;
};

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {};
  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      headers[key] = value;
    }
  } else if (init.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  if (!headers["Content-Type"] && init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API request to ${path} failed: ${response.status} ${response.statusText} ${text}`);
  }

  return response;
}

export async function createTestUser(options: CreateUserOptions = {}): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8);
  const email = `e2e+${suffix}@example.com`;
  const password = `Playwright!${suffix}`;

  const signupRes = await apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const signupJson = (await signupRes.json()) as { accessToken: string };

  const uniqueId = `e2e-${suffix}`;
  const name = `E2E Tester ${suffix}`;

  await apiRequest("/api/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${signupJson.accessToken}`,
    },
    body: JSON.stringify({
      uniqueid: uniqueId,
      name,
      bio: "Playwright test user",
      isPrivate: options.isPrivate ?? false,
      dmEnabled: options.dmEnabled ?? true,
    }),
  });

  return { email, password, uniqueId, name, accessToken: signupJson.accessToken };
}

export async function createPostForUser(user: TestUser, content: string, visibility: "public" | "followers" = "public") {
  const response = await apiRequest("/api/post", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
    },
    body: JSON.stringify({
      content,
      visibility,
    }),
  });

  const json = await response.json();
  return json.post;
}

export async function signInThroughUI(page: Page, user: TestUser) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
}

export async function logoutThroughUI(page: Page, uniqueId?: string) {
  const trigger = uniqueId
    ? page.getByRole("button", { name: new RegExp(`@${uniqueId}`, "i") })
    : page.getByRole("button", { name: /@/ });
  await trigger.click();
  await page.getByRole("menuitem", { name: "ログアウト" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}
