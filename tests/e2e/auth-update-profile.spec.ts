import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("a signed-in user can set their own display name, first name, and last name from the account page", async ({
  page,
}) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const email = `profile-${Date.now()}@example.com`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (createError) throw createError;

  // Captcha-exempt sign-in, same technique as rls-organization-isolation.spec.ts —
  // navigate the real browser through /auth/confirm so it gets real session cookies.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  await page.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink`,
  );
  await expect(page).toHaveURL(/127\.0\.0\.1:3002/);

  await page.goto("http://127.0.0.1:3002/account");
  await page.getByLabel("Display name").fill("Ada");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Ada");
  await expect(page.getByLabel("First name")).toHaveValue("Ada");
  await expect(page.getByLabel("Last name")).toHaveValue("Lovelace");

  const { data: profile, error: profileError } = await admin
    .from("member_profiles")
    .select("display_name, first_name, last_name")
    .eq("id", created!.user!.id)
    .single();
  if (profileError) throw profileError;
  expect(profile).toMatchObject({ display_name: "Ada", first_name: "Ada", last_name: "Lovelace" });

  await admin.auth.admin.deleteUser(created!.user!.id);
});
