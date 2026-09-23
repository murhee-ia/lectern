import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("org-console: only the org's Admin can open its member list; a Member sees it as non-clickable and gets a 404 by URL", async ({
  browser,
}) => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // --- Org Admin: create, verify via a throwaway RPC-only link, ensure their org-of-one ---
  const adminEmail = `console-admin-${Date.now()}@example.com`;
  const { data: adminCreated, error: adminCreateError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (adminCreateError) throw adminCreateError;

  const { data: adminRpcLink, error: adminRpcLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: adminEmail,
  });
  if (adminRpcLinkError) throw adminRpcLinkError;

  const asOrgAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: adminVerifyError } = await asOrgAdmin.auth.verifyOtp({
    type: "magiclink",
    token_hash: adminRpcLink.properties.hashed_token,
  });
  if (adminVerifyError) throw adminVerifyError;

  const { data: organizationId, error: ensureError } = await asOrgAdmin.rpc("ensure_personal_organization");
  if (ensureError) throw ensureError;

  const { data: organization, error: organizationError } = await asOrgAdmin
    .from("organizations")
    .select("name, join_code")
    .eq("id", organizationId!)
    .single();
  if (organizationError) throw organizationError;

  // --- Org Member: a second user who joins the same org by code (always as Member) ---
  const memberEmail = `console-member-${Date.now()}@example.com`;
  const { data: memberCreated, error: memberCreateError } = await admin.auth.admin.createUser({
    email: memberEmail,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (memberCreateError) throw memberCreateError;

  const { data: memberRpcLink, error: memberRpcLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: memberEmail,
  });
  if (memberRpcLinkError) throw memberRpcLinkError;

  const asOrgMember = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error: memberVerifyError } = await asOrgMember.auth.verifyOtp({
    type: "magiclink",
    token_hash: memberRpcLink.properties.hashed_token,
  });
  if (memberVerifyError) throw memberVerifyError;

  const { error: joinError } = await asOrgMember.rpc("join_organization_by_code", { code: organization.join_code });
  if (joinError) throw joinError;

  // --- Admin, for real, in the browser: the org is a link, and the detail page lists both members ---
  // A fresh generateLink call is needed here — the RPC-only link above was
  // already consumed by asOrgAdmin.auth.verifyOtp() and can't be replayed.
  const { data: adminBrowserLink, error: adminBrowserLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: adminEmail,
  });
  if (adminBrowserLinkError) throw adminBrowserLinkError;

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${adminBrowserLink.properties.hashed_token}&type=magiclink`,
  );
  await expect(adminPage).toHaveURL(/127\.0\.0\.1:3002/);

  await adminPage.goto("http://127.0.0.1:3001/");
  const orgLink = adminPage.getByRole("link", { name: organization.name });
  await expect(orgLink).toBeVisible();
  await orgLink.click();
  await expect(adminPage).toHaveURL(`http://127.0.0.1:3001/organizations/${organizationId}`);
  await expect(adminPage.getByText(adminEmail)).toBeVisible();
  await expect(adminPage.getByText(memberEmail)).toBeVisible();
  await adminContext.close();

  // --- Member, for real, in the browser: same org renders non-clickable, and the URL 404s directly ---
  const { data: memberBrowserLink, error: memberBrowserLinkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: memberEmail,
  });
  if (memberBrowserLinkError) throw memberBrowserLinkError;

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await memberPage.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${memberBrowserLink.properties.hashed_token}&type=magiclink`,
  );
  await expect(memberPage).toHaveURL(/127\.0\.0\.1:3002/);

  await memberPage.goto("http://127.0.0.1:3001/");
  await expect(memberPage.getByText(organization.name)).toBeVisible();
  await expect(memberPage.getByRole("link", { name: organization.name })).toHaveCount(0);

  const detailResponse = await memberPage.goto(`http://127.0.0.1:3001/organizations/${organizationId}`);
  expect(detailResponse?.status()).toBe(404);
  await memberContext.close();

  await admin.auth.admin.deleteUser(adminCreated!.user!.id);
  await admin.auth.admin.deleteUser(memberCreated!.user!.id);
  await admin.from("organizations").delete().eq("id", organizationId!);
});
