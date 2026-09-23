import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("switching organizations updates the home page and persists across a reload via the selection cookie", async ({
  page,
}) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // --- The switching user: create, and set up their own org-of-one via an RPC-only session ---
  const email = `switcher-${Date.now()}@example.com`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (createError) throw createError;

  const { data: rpcLink, error: rpcLinkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (rpcLinkError) throw rpcLinkError;

  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: verifyError } = await asUser.auth.verifyOtp({
    type: "magiclink",
    token_hash: rpcLink.properties.hashed_token,
  });
  if (verifyError) throw verifyError;

  const { data: personalOrgId, error: ensureError } = await asUser.rpc("ensure_personal_organization");
  if (ensureError) throw ensureError;
  const { data: personalOrg, error: personalOrgError } = await asUser
    .from("organizations")
    .select("name")
    .eq("id", personalOrgId!)
    .single();
  if (personalOrgError) throw personalOrgError;

  // --- A second org, owned by a throwaway Admin, that the switching user joins by code ---
  const ownerEmail = `switcher-owner-${Date.now()}@example.com`;
  const { data: ownerCreated, error: ownerCreateError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (ownerCreateError) throw ownerCreateError;

  const { data: ownerLink, error: ownerLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerEmail,
  });
  if (ownerLinkError) throw ownerLinkError;

  const asOwner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: ownerVerifyError } = await asOwner.auth.verifyOtp({
    type: "magiclink",
    token_hash: ownerLink.properties.hashed_token,
  });
  if (ownerVerifyError) throw ownerVerifyError;

  const { data: secondOrgId, error: ownerEnsureError } = await asOwner.rpc("ensure_personal_organization");
  if (ownerEnsureError) throw ownerEnsureError;
  const { data: secondOrg, error: secondOrgError } = await asOwner
    .from("organizations")
    .select("name, join_code")
    .eq("id", secondOrgId!)
    .single();
  if (secondOrgError) throw secondOrgError;

  const { error: joinError } = await asUser.rpc("join_organization_by_code", { code: secondOrg.join_code });
  if (joinError) throw joinError;

  // --- For real, in the browser ---
  // A fresh generateLink call — the RPC-only link above was already consumed.
  const { data: browserLink, error: browserLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (browserLinkError) throw browserLinkError;

  await page.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${browserLink.properties.hashed_token}&type=magiclink`,
  );
  await expect(page).toHaveURL(/127\.0\.0\.1:3002/);

  // Defaults to the earliest membership — the personal org-of-one.
  await expect(page.getByRole("heading", { name: personalOrg.name, exact: true })).toBeVisible();

  // Not exact — each dropdown item's accessible name is "{name} {role}", not
  // the bare org name; the trigger button's own name has no such suffix, but
  // a substring match still uniquely identifies both, in both states.
  await page.getByRole("button", { name: personalOrg.name }).click();
  await page.getByRole("button", { name: secondOrg.name }).click();
  await expect(page.getByRole("heading", { name: secondOrg.name, exact: true })).toBeVisible();

  // The heading above updates from the optimistic Zustand store instantly —
  // selectOrganizationAction's cookie write runs separately in a
  // startTransition and can still be in flight. The trigger button is
  // disabled for the duration of that transition, so wait for it to clear
  // before reloading, or the reload can race the cookie write.
  await expect(page.getByRole("button", { name: secondOrg.name, exact: true })).toBeEnabled();

  await page.reload();
  await expect(page.getByRole("heading", { name: secondOrg.name, exact: true })).toBeVisible();

  await admin.auth.admin.deleteUser(created!.user!.id);
  await admin.auth.admin.deleteUser(ownerCreated!.user!.id);
  await admin.from("organizations").delete().eq("id", personalOrgId!);
  await admin.from("organizations").delete().eq("id", secondOrgId!);
});
