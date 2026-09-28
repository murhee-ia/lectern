import { test, expect, type Browser, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getLatestEmailLinkFor } from './utils/inbucket';

const MARKETING = 'http://127.0.0.1:3000';
const WORKSPACE = 'http://127.0.0.1:3002';
const CONSOLE = 'http://127.0.0.1:3001';
const INVITATION_LINK =
  /http:\/\/127\.0\.0\.1:3000\/invitation\?token=[0-9a-f]+/;
const MAIL_URL = 'http://127.0.0.1:54324';

const service = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

type Account = { id: string; email: string; client: SupabaseClient };

// A confirmed account, signed in on a Node client for direct database calls.
async function createAccount(
  admin: SupabaseClient,
  email: string,
  firstName: string,
  lastName: string,
): Promise<Account> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'correcthorsebattery',
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) throw error;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) throw linkError;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: verifyError } = await client.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw verifyError;
  return { id: data.user!.id, email, client };
}

// An Admin with their org-of-one moved to a paid plan, so it can invite.
async function createAdminWithOrganization(
  admin: SupabaseClient,
  email: string,
) {
  const account = await createAccount(admin, email, 'Invite', 'Admin');
  const { data: organizationId, error } = await account.client.rpc(
    'ensure_personal_organization',
  );
  if (error) throw error;
  await admin
    .from('organizations')
    .update({ plan: 'basic' })
    .eq('id', organizationId!);
  const { data: organization } = await admin
    .from('organizations')
    .select('name')
    .eq('id', organizationId!)
    .single();
  return {
    ...account,
    organizationId: organizationId!,
    organizationName: organization!.name,
  };
}

// Signs a browser context in through a one-time link, landing in the workspace.
async function signInBrowser(
  browser: Browser,
  admin: SupabaseClient,
  email: string,
) {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) throw linkError;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    `${MARKETING}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink`,
  );
  await expect(page).toHaveURL(new RegExp(WORKSPACE.replaceAll('.', '\\.')));
  return page;
}

async function sendInvitation(
  page: Page,
  email: string,
  role: 'Member' | 'Session leader',
) {
  await page.getByRole('button', { name: 'Invite by email' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill(email);
  if (role === 'Session leader') {
    await dialog.getByRole('button', { name: 'Role' }).click();
    await page.getByRole('menuitemradio', { name: 'Session leader' }).click();
  }
  await dialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dialog.getByText(`Invitation sent to ${email}.`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
}

// Every invitation link emailed to an address, newest first.
async function invitationLinksFor(email: string): Promise<string[]> {
  const search = await fetch(
    `${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  const { messages } = (await search.json()) as {
    messages: Array<{ ID: string }>;
  };
  const links: string[] = [];
  for (const { ID } of messages) {
    const message = (await (
      await fetch(`${MAIL_URL}/api/v1/message/${ID}`)
    ).json()) as { Text: string };
    const match = message.Text.match(INVITATION_LINK);
    if (match) links.push(match[0]);
  }
  return links;
}

async function waitForNewInvitationLink(
  email: string,
  notThis: string,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const fresh = (await invitationLinksFor(email)).find(
      (link) => link !== notThis,
    );
    if (fresh) return fresh;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`No new invitation link for ${email}`);
}

async function cleanUp(
  admin: SupabaseClient,
  userIds: string[],
  organizationIds: string[],
) {
  for (const organizationId of organizationIds) {
    await admin.from('organizations').delete().eq('id', organizationId);
  }
  for (const userId of userIds) {
    const { data: owned } = await admin
      .from('organizations')
      .select('id')
      .eq('created_by', userId);
    for (const { id } of owned ?? [])
      await admin.from('organizations').delete().eq('id', id);
    await admin.auth.admin.deleteUser(userId);
  }
}

test('an Admin invites an existing account and a new address; each accepts through the emailed link and joins with the invited role', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const admin = service();
  const stamp = Date.now();
  const owner = await createAdminWithOrganization(
    admin,
    `invite-owner-${stamp}@example.com`,
  );
  const existing = await createAccount(
    admin,
    `invite-existing-${stamp}@example.com`,
    'Existing',
    'Invitee',
  );
  // Every real account gets its org-of-one on confirming its email; this one
  // was created directly, so give it one the same way.
  const { data: existingOrganizationId } = await existing.client.rpc(
    'ensure_personal_organization',
  );
  const newEmail = `invite-new-${stamp}@example.com`;
  let newUserId: string | undefined;

  try {
    // --- The Admin sends both invitations from the console ---
    const adminPage = await signInBrowser(browser, admin, owner.email);
    await adminPage.goto(
      `${CONSOLE}/organizations/${owner.organizationId}/invitations`,
    );
    await sendInvitation(adminPage, existing.email, 'Session leader');
    await sendInvitation(adminPage, newEmail, 'Member');
    await expect(adminPage.getByText(existing.email)).toBeVisible();
    await expect(adminPage.getByText(newEmail)).toBeVisible();

    // --- The existing account: link → sign in (email locked) → Accept ---
    const existingLink = await getLatestEmailLinkFor(
      existing.email,
      INVITATION_LINK,
    );
    const existingPage = await (await browser.newContext()).newPage();
    await existingPage.goto(existingLink);
    await expect(existingPage).toHaveURL(/127\.0\.0\.1:3000\/signin\?/);
    const signinEmail = existingPage.getByLabel('Email');
    await expect(signinEmail).toHaveValue(existing.email);
    await expect(signinEmail).toHaveAttribute('readonly', '');
    await existingPage.getByLabel('Password').fill('correcthorsebattery');
    await expect(
      existingPage.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeEnabled({ timeout: 15_000 });
    await existingPage
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    await expect(existingPage).toHaveURL(
      /127\.0\.0\.1:3002\/invitations\/accept\?token=/,
    );
    const existingDialog = existingPage.getByRole('dialog');
    await expect(
      existingDialog.getByRole('heading', {
        name: `Join ${owner.organizationName}`,
      }),
    ).toBeVisible();
    await expect(existingDialog.getByText('as a Session leader')).toBeVisible();
    // Accept is the only way on: Escape doesn't close it.
    await existingPage.keyboard.press('Escape');
    await expect(existingDialog).toBeVisible();
    await existingDialog
      .getByRole('button', { name: 'Accept invitation' })
      .click();
    await expect(existingPage).toHaveURL(`${WORKSPACE}/`);
    await expect(
      existingPage.getByRole('heading', {
        level: 1,
        name: owner.organizationName,
      }),
    ).toBeVisible();

    // --- The new address: link → sign up (email locked) → confirm → Accept ---
    const newLink = await getLatestEmailLinkFor(newEmail, INVITATION_LINK);
    const newPage = await (await browser.newContext()).newPage();
    await newPage.goto(newLink);
    await expect(newPage).toHaveURL(/127\.0\.0\.1:3000\/signup\?/);
    const signupEmail = newPage.getByLabel('Email');
    await expect(signupEmail).toHaveValue(newEmail);
    await expect(signupEmail).toHaveAttribute('readonly', '');
    await newPage.getByLabel('First name').fill('New');
    await newPage.getByLabel('Last name').fill('Invitee');
    await newPage.getByLabel('Password').fill('correcthorsebattery');
    await expect(newPage.getByRole('button', { name: 'Sign up' })).toBeEnabled({
      timeout: 15_000,
    });
    await newPage.getByRole('button', { name: 'Sign up' }).click();
    await expect(newPage.getByText('Check your email')).toBeVisible();
    const confirmationLink = await getLatestEmailLinkFor(
      newEmail,
      /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*/,
    );
    await newPage.goto(confirmationLink);
    await expect(newPage).toHaveURL(
      /127\.0\.0\.1:3002\/invitations\/accept\?token=/,
    );
    await newPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Accept invitation' })
      .click();
    await expect(newPage).toHaveURL(`${WORKSPACE}/`);
    await expect(
      newPage.getByRole('heading', { level: 1, name: owner.organizationName }),
    ).toBeVisible();

    // --- Accepted invitations leave the log; both are members now ---
    await adminPage.goto(
      `${CONSOLE}/organizations/${owner.organizationId}/invitations`,
    );
    await expect(adminPage.getByText('No invitations sent yet.')).toBeVisible();
    await adminPage.goto(
      `${CONSOLE}/organizations/${owner.organizationId}/members`,
    );
    await expect(
      adminPage.getByText('Existing Invitee', { exact: true }),
    ).toBeVisible();
    await expect(
      adminPage.getByText('New Invitee', { exact: true }),
    ).toBeVisible();

    const { data: newUser } = await admin
      .from('member_profiles')
      .select('id')
      .eq('email', newEmail)
      .single();
    newUserId = newUser!.id;
    const { data: memberships } = await admin
      .from('memberships')
      .select('user_id, role, join_method')
      .eq('organization_id', owner.organizationId);
    expect(memberships).toEqual(
      expect.arrayContaining([
        {
          user_id: existing.id,
          role: 'session_leader',
          join_method: 'email_invitation',
        },
        { user_id: newUserId, role: 'member', join_method: 'email_invitation' },
      ]),
    );
    // The new account still got its own org-of-one on confirmation.
    const { count: newUserMemberships } = await admin
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', newUserId);
    expect(newUserMemberships).toBe(2);
    const { data: invitations } = await admin
      .from('organization_invites')
      .select('status, accepted_by')
      .eq('organization_id', owner.organizationId);
    expect(invitations).toEqual(
      expect.arrayContaining([
        { status: 'accepted', accepted_by: existing.id },
        { status: 'accepted', accepted_by: newUserId },
      ]),
    );
  } finally {
    await cleanUp(
      admin,
      [existing.id, owner.id, ...(newUserId ? [newUserId] : [])],
      [owner.organizationId, existingOrganizationId!],
    );
  }
});

test('a canceled link stops working and a resent one works; an existing member is told only on opening it; a wrong account is sent to sign in as the invited address', async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const admin = service();
  const stamp = Date.now();
  const owner = await createAdminWithOrganization(
    admin,
    `resend-owner-${stamp}@example.com`,
  );
  const member = await createAccount(
    admin,
    `resend-member-${stamp}@example.com`,
    'Already',
    'Member',
  );
  await admin.from('memberships').insert({
    user_id: member.id,
    organization_id: owner.organizationId,
    role: 'member',
    join_method: 'join_code',
  });
  const invitee = `resend-invitee-${stamp}@example.com`;

  try {
    const adminPage = await signInBrowser(browser, admin, owner.email);
    const invitationsUrl = `${CONSOLE}/organizations/${owner.organizationId}/invitations`;
    await adminPage.goto(invitationsUrl);
    await sendInvitation(adminPage, invitee, 'Member');
    const firstLink = await getLatestEmailLinkFor(invitee, INVITATION_LINK);

    // Cancel: the row says Canceled, and the link already sent stops working.
    const inviteeRow = adminPage.locator('li', { hasText: invitee });
    await inviteeRow.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      inviteeRow.getByText('Canceled', { exact: true }),
    ).toBeVisible();
    const strangerPage = await (await browser.newContext()).newPage();
    await strangerPage.goto(firstLink);
    await expect(
      strangerPage.getByText('This invitation link no longer works'),
    ).toBeVisible();

    // Resend: a new email, whose link works (to sign-up: no account yet).
    await inviteeRow.getByRole('button', { name: 'Resend' }).click();
    await expect(
      inviteeRow.getByText('Pending', { exact: true }),
    ).toBeVisible();
    const resentLink = await waitForNewInvitationLink(invitee, firstLink);
    await strangerPage.goto(resentLink);
    await expect(strangerPage).toHaveURL(/127\.0\.0\.1:3000\/signup\?/);

    // Inviting an existing member's address isn't refused: nothing tells the Admin.
    await sendInvitation(adminPage, member.email, 'Member');
    const memberLink = await getLatestEmailLinkFor(
      member.email,
      INVITATION_LINK,
    );
    const memberPage = await signInBrowser(browser, admin, member.email);
    await memberPage.goto(memberLink);
    await expect(memberPage).toHaveURL(
      /127\.0\.0\.1:3002\/invitations\/accept/,
    );
    await expect(
      memberPage.getByText(`You already belong to ${owner.organizationName}`),
    ).toBeVisible();
    await adminPage.goto(invitationsUrl);
    await expect(
      adminPage
        .locator('li', { hasText: member.email })
        .getByText('Pending', { exact: true }),
    ).toBeVisible();

    // The member, still signed in, opens the invitee's link: a wrong account.
    await memberPage.goto(resentLink);
    const dialog = memberPage.getByRole('dialog');
    await expect(
      dialog.getByText(`This invitation is for ${invitee}`),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Sign out and continue' }).click();
    await expect(memberPage).toHaveURL(/127\.0\.0\.1:3000\/signup\?/);
    await expect(memberPage.getByLabel('Email')).toHaveValue(invitee);
  } finally {
    await cleanUp(admin, [member.id, owner.id], [owner.organizationId]);
  }
});

test('only an Admin can send, cancel, or resend, and a Free organization cannot invite', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const admin = service();
  const stamp = Date.now();
  const owner = await createAdminWithOrganization(
    admin,
    `guard-owner-${stamp}@example.com`,
  );
  const member = await createAccount(
    admin,
    `guard-member-${stamp}@example.com`,
    'Plain',
    'Member',
  );
  await admin.from('memberships').insert({
    user_id: member.id,
    organization_id: owner.organizationId,
    role: 'member',
    join_method: 'join_code',
  });
  const freeOwner = await createAccount(
    admin,
    `guard-free-${stamp}@example.com`,
    'Free',
    'Owner',
  );
  const { data: freeOrganizationId } = await freeOwner.client.rpc(
    'ensure_personal_organization',
  );

  try {
    // Called straight at the database, a Member is refused every time.
    const send = await member.client.rpc('send_organization_invitation', {
      target_organization_id: owner.organizationId,
      invitee_email: `sneaky-${stamp}@example.com`,
      invitee_role: 'member',
    });
    expect(send.error?.message).toBe('Not authorized');
    const cancel = await member.client.rpc('cancel_organization_invitations', {
      target_organization_id: owner.organizationId,
      invitation_ids: [],
    });
    expect(cancel.error?.message).toBe('Not authorized');
    const resend = await member.client.rpc('resend_organization_invitations', {
      target_organization_id: owner.organizationId,
      invitation_ids: [],
    });
    expect(resend.error?.message).toBe('Not authorized');
    // Nor can anyone write the table directly.
    const directInsert = await owner.client
      .from('organization_invites')
      .insert({
        organization_id: owner.organizationId,
        email: `direct-${stamp}@example.com`,
        invited_by: owner.id,
        token_hash: 'x',
      });
    expect(directInsert.error).not.toBeNull();

    // A Free organization's one member is its Admin: no room to invite.
    const freePage = await signInBrowser(browser, admin, freeOwner.email);
    await freePage.goto(
      `${CONSOLE}/organizations/${freeOrganizationId}/invitations`,
    );
    await freePage.getByRole('button', { name: 'Invite by email' }).click();
    const dialog = freePage.getByRole('dialog');
    await dialog.getByLabel('Email').fill(`capped-${stamp}@example.com`);
    await dialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(
      dialog.getByText(
        'This organization has reached its member limit for its plan.',
      ),
    ).toBeVisible();
  } finally {
    await cleanUp(
      admin,
      [member.id, owner.id, freeOwner.id],
      [owner.organizationId, freeOrganizationId!],
    );
  }
});

test('Google sign-in from an invitation goes through Lectern first, and a return it can’t trust creates nothing', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const admin = service();
  const stamp = Date.now();
  const owner = await createAdminWithOrganization(
    admin,
    `google-owner-${stamp}@example.com`,
  );
  const inviteeEmail = `google-invitee-${stamp}@example.com`;

  try {
    const { data: invitationToken, error } = await owner.client.rpc(
      'send_organization_invitation',
      {
        target_organization_id: owner.organizationId,
        invitee_email: inviteeEmail,
        invitee_role: 'member',
      },
    );
    if (error) throw error;

    // Stand in for Google. Lectern's start route runs for real; where it
    // would send the browser is noted, and instead the browser comes straight
    // back with a code Google never issued, so the exchange is refused.
    let googleUrl: URL | undefined;
    await page.route(
      (url) => url.pathname === '/auth/invitation/google',
      async (route) => {
        const started = await route.fetch({ maxRedirects: 0 });
        googleUrl = new URL(started.headers()['location']!);
        const callbackUrl = new URL(
          googleUrl.searchParams.get('redirect_uri')!,
        );
        callbackUrl.searchParams.set('code', 'not-a-real-code');
        callbackUrl.searchParams.set(
          'state',
          googleUrl.searchParams.get('state')!,
        );
        await route.fulfill({
          status: 302,
          headers: {
            Location: callbackUrl.toString(),
            'Set-Cookie': started.headers()['set-cookie']!,
          },
        });
      },
    );

    await page.goto(`${MARKETING}/invitation?token=${invitationToken}`);
    await expect(page).toHaveURL(/127\.0\.0\.1:3000\/signup\?.*invitation=/);
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    // Back on the invitation's sign-up form, told what happened.
    await expect(page).toHaveURL(/\/signup\?.*error=oauth_failed/);
    await expect(
      page.getByText("Google sign-in didn't finish. Try again."),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(inviteeEmail);

    // Lectern asked Google itself, suggesting the invited account and asking
    // for it back at Lectern's callback, not Supabase's.
    expect(`${googleUrl!.origin}${googleUrl!.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(googleUrl!.searchParams.get('login_hint')).toBe(inviteeEmail);
    expect(googleUrl!.searchParams.get('redirect_uri')).toBe(
      `${MARKETING}/auth/invitation/google/callback`,
    );

    // A return this browser didn't start is refused outright.
    await page.goto(
      `${MARKETING}/auth/invitation/google/callback?code=x&state=forged`,
    );
    await expect(page).toHaveURL(/\/signin\?error=oauth_failed/);

    const { count } = await admin
      .from('member_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('email', inviteeEmail);
    expect(count).toBe(0);
  } finally {
    await cleanUp(admin, [owner.id], [owner.organizationId]);
  }
});
