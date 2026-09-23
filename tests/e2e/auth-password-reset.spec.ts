import { test, expect } from "@playwright/test";
import { getLatestEmailLinkFor } from "./utils/inbucket";

test("password reset round-trip via Inbucket", async ({ page }) => {
  const email = `reset-${Date.now()}@example.com`;

  await page.goto("http://127.0.0.1:3000/signup");
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correcthorsebattery");
  await expect(page.getByRole("button", { name: "Sign up" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "Sign up" }).click();

  const confirmationLink = await getLatestEmailLinkFor(email, /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*/);
  await page.goto(confirmationLink);

  await page.goto("http://127.0.0.1:3000/reset-password");
  await page.getByLabel("Email").fill(email);
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "Send reset link" }).click();

  const recoveryLink = await getLatestEmailLinkFor(email, /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*type=recovery[^"<\s]*/);
  await page.goto(recoveryLink);

  await expect(page).toHaveURL(/reset-password\/update/);
  await page.getByLabel("New password").fill("newcorrecthorsebattery");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.getByText("Password updated")).toBeVisible();
});
