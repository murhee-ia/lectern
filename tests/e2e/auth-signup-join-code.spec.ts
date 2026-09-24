import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLatestEmailLinkFor } from './utils/inbucket';

test("signup with a valid organization code joins that org as Member, in addition to the joiner's own free org-of-one", async ({
  page,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Set up an existing org via its Admin, using the same captcha-exempt
  // magic-link technique as rls-organization-isolation.spec.ts.
  const ownerEmail = `join-code-owner-${Date.now()}@example.com`;
  const { data: ownerCreated, error: createError } =
    await admin.auth.admin.createUser({
      email: ownerEmail,
      password: 'correcthorsebattery',
      email_confirm: true,
    });
  if (createError) throw createError;

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: ownerEmail,
    });
  if (linkError) throw linkError;

  const asOwner = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: verifyError } = await asOwner.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError) throw verifyError;

  const { data: ownerOrganizationId, error: ensureError } = await asOwner.rpc(
    'ensure_personal_organization',
  );
  if (ensureError) throw ensureError;

  const { data: organization, error: organizationError } = await asOwner
    .from('organizations')
    .select('name, join_code')
    .eq('id', ownerOrganizationId!)
    .single();
  if (organizationError) throw organizationError;
  const joinCode = organization.join_code;

  // Now sign up a second, brand-new user through the real UI with that code.
  const joinerEmail = `join-code-joiner-${Date.now()}@example.com`;
  await page.goto(`http://127.0.0.1:3000/signup?join_code=${joinCode}`);
  await expect(page.getByLabel('Organization code (optional)')).toHaveValue(
    joinCode,
  );
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Email').fill(joinerEmail);
  await page.getByLabel('Password').fill('correcthorsebattery');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Sign up' }).click();

  const confirmationLink = await getLatestEmailLinkFor(
    joinerEmail,
    /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*/,
  );
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(
    new RegExp(
      `127\\.0\\.0\\.1:3002/\\?notice=joined_organization&joinedOrganizationId=${ownerOrganizationId}`,
    ),
  );
  await expect(page.getByText(organization.name)).toBeVisible();

  // The owner's org now has two members: the original owner (admin) and the joiner (member).
  const { data: ownerOrgMemberships, error: ownerOrgMembershipsError } =
    await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', ownerOrganizationId!);
  if (ownerOrgMembershipsError) throw ownerOrgMembershipsError;

  expect(ownerOrgMemberships).toHaveLength(2);
  expect(ownerOrgMemberships?.some((row) => row.role === 'member')).toBe(true);
  expect(ownerOrgMemberships?.some((row) => row.role === 'admin')).toBe(true);

  // The joiner ALSO got their own free org-of-one — a join code is additive,
  // never a replacement. Two total memberships for the joiner: their own
  // org (admin) plus the one they joined by code (member).
  const { data: joinerProfile, error: joinerProfileError } = await admin
    .from('member_profiles')
    .select('id')
    .eq('email', joinerEmail)
    .single();
  if (joinerProfileError) throw joinerProfileError;

  const { data: joinerMemberships, error: joinerMembershipsError } = await admin
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', joinerProfile.id);
  if (joinerMembershipsError) throw joinerMembershipsError;

  expect(joinerMemberships).toHaveLength(2);
  expect(
    joinerMemberships?.some(
      (row) =>
        row.organization_id === ownerOrganizationId && row.role === 'member',
    ),
  ).toBe(true);
  expect(
    joinerMemberships?.some(
      (row) =>
        row.organization_id !== ownerOrganizationId && row.role === 'admin',
    ),
  ).toBe(true);

  await admin.auth.admin.deleteUser(ownerCreated!.user!.id);
  await admin.auth.admin.deleteUser(joinerProfile.id);
});

test('signup with an invalid organization code still completes, falling back to a new org-of-one', async ({
  page,
}) => {
  const email = `join-code-invalid-${Date.now()}@example.com`;

  await page.goto(
    'http://127.0.0.1:3000/signup?join_code=this-code-does-not-exist',
  );
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correcthorsebattery');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Sign up' }).click();

  const confirmationLink = await getLatestEmailLinkFor(
    email,
    /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*/,
  );
  await page.goto(confirmationLink);

  await expect(page).toHaveURL(/127\.0\.0\.1:3002\/\?notice=invalid_join_code/);
});
