import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test("org-console: only the org's Admin can open its console; a Member sees it as non-clickable, gets a 404 on every console URL, and sees co-members read-only in the workspace", async ({
  browser,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // --- Org Admin: create, verify via a throwaway RPC-only link, ensure their org-of-one ---
  const adminEmail = `console-admin-${Date.now()}@example.com`;
  const { data: adminCreated, error: adminCreateError } =
    await admin.auth.admin.createUser({
      email: adminEmail,
      password: 'correcthorsebattery',
      email_confirm: true,
      user_metadata: { first_name: 'Console', last_name: 'Admin' },
    });
  if (adminCreateError) throw adminCreateError;

  const { data: adminRpcLink, error: adminRpcLinkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
    });
  if (adminRpcLinkError) throw adminRpcLinkError;

  const asOrgAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: adminVerifyError } = await asOrgAdmin.auth.verifyOtp({
    type: 'magiclink',
    token_hash: adminRpcLink.properties.hashed_token,
  });
  if (adminVerifyError) throw adminVerifyError;

  const { data: organizationId, error: ensureError } = await asOrgAdmin.rpc(
    'ensure_personal_organization',
  );
  if (ensureError) throw ensureError;

  const { data: organization, error: organizationError } = await asOrgAdmin
    .from('organizations')
    .select('name, join_code')
    .eq('id', organizationId!)
    .single();
  if (organizationError) throw organizationError;

  // --- Org Member: a second user who joins the same org by code (always as Member) ---
  const memberEmail = `console-member-${Date.now()}@example.com`;
  const { data: memberCreated, error: memberCreateError } =
    await admin.auth.admin.createUser({
      email: memberEmail,
      password: 'correcthorsebattery',
      email_confirm: true,
      user_metadata: { first_name: 'Console', last_name: 'Member' },
    });
  if (memberCreateError) throw memberCreateError;

  const { data: memberRpcLink, error: memberRpcLinkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: memberEmail,
    });
  if (memberRpcLinkError) throw memberRpcLinkError;

  const asOrgMember = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: memberVerifyError } = await asOrgMember.auth.verifyOtp({
    type: 'magiclink',
    token_hash: memberRpcLink.properties.hashed_token,
  });
  if (memberVerifyError) throw memberVerifyError;

  const { error: joinError } = await asOrgMember.rpc(
    'join_organization_by_code',
    { code: organization.join_code },
  );
  if (joinError) throw joinError;

  // --- Admin, for real, in the browser: the org is a link to its console dashboard ---
  // A fresh generateLink call is needed here — the RPC-only link above was
  // already consumed by asOrgAdmin.auth.verifyOtp() and can't be replayed.
  const { data: adminBrowserLink, error: adminBrowserLinkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
    });
  if (adminBrowserLinkError) throw adminBrowserLinkError;

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${adminBrowserLink.properties.hashed_token}&type=magiclink`,
  );
  await expect(adminPage).toHaveURL(/127\.0\.0\.1:3002/);

  await adminPage.goto('http://127.0.0.1:3001/');
  const orgLink = adminPage.getByRole('link', { name: organization.name });
  await expect(orgLink).toBeVisible();
  await orgLink.click();
  await expect(adminPage).toHaveURL(
    `http://127.0.0.1:3001/organizations/${organizationId}`,
  );
  await expect(
    adminPage.getByRole('heading', { level: 1, name: organization.name }),
  ).toBeVisible();
  await expect(adminPage.getByRole('link', { name: /Members/ })).toBeVisible();

  // The console's member list is the one place an email address is shown.
  await adminPage.goto(
    `http://127.0.0.1:3001/organizations/${organizationId}/members`,
  );
  await expect(adminPage.getByText(memberEmail)).toBeVisible();
  await adminContext.close();

  // --- Member, for real, in the browser: same org renders non-clickable, and every console URL 404s ---
  const { data: memberBrowserLink, error: memberBrowserLinkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: memberEmail,
    });
  if (memberBrowserLinkError) throw memberBrowserLinkError;

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await memberPage.goto(
    `http://127.0.0.1:3000/auth/confirm?token_hash=${memberBrowserLink.properties.hashed_token}&type=magiclink`,
  );
  await expect(memberPage).toHaveURL(/127\.0\.0\.1:3002/);

  await memberPage.goto('http://127.0.0.1:3001/');
  await expect(memberPage.getByText(organization.name)).toBeVisible();
  await expect(
    memberPage.getByRole('link', { name: organization.name }),
  ).toHaveCount(0);

  const detailResponse = await memberPage.goto(
    `http://127.0.0.1:3001/organizations/${organizationId}`,
  );
  expect(detailResponse?.status()).toBe(404);

  // The Admin-only gate sits on the organization's layout, so it has to hold
  // for every section beneath it — not just the dashboard.
  const sectionResponse = await memberPage.goto(
    `http://127.0.0.1:3001/organizations/${organizationId}/members`,
  );
  expect(sectionResponse?.status()).toBe(404);

  // The workspace, by contrast, shows every member who's in the organization
  // — read-only, whatever their role, and by name only. The Member joined
  // this organization before their own org-of-one was created, so it's the
  // one selected.
  await memberPage.goto('http://127.0.0.1:3002/members');
  await expect(
    memberPage.getByText('Console Admin', { exact: true }),
  ).toBeVisible();
  await expect(
    memberPage.getByText('Console Member', { exact: true }),
  ).toBeVisible();
  await expect(memberPage.getByText(adminEmail)).toHaveCount(0);
  await expect(memberPage.getByText(memberEmail)).toHaveCount(0);
  await memberContext.close();

  await admin.auth.admin.deleteUser(adminCreated!.user!.id);
  await admin.auth.admin.deleteUser(memberCreated!.user!.id);
  await admin.from('organizations').delete().eq('id', organizationId!);
});
