import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getLatestEmailLinkFor } from './utils/inbucket';

test('email OTP signs in an existing, confirmed user end-to-end via Mailpit', async ({
  page,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const email = `otp-signin-${Date.now()}@example.com`;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: 'correcthorsebattery',
      email_confirm: true,
    });
  if (createError) throw createError;

  await page.goto('http://127.0.0.1:3000/otp');
  await page.getByLabel('Email').fill(email);
  await expect(page.getByRole('button', { name: 'Send code' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Send code' }).click();

  await expect(page.getByText('Enter your code')).toBeVisible();

  const codeLink = await getLatestEmailLinkFor(email, /\b\d{6}\b/);
  const code = codeLink.match(/\d{6}/)![0];

  await page.getByPlaceholder('123456').fill(code);
  await page.getByRole('button', { name: 'Verify and sign in' }).click();

  await expect(page).toHaveURL(/127\.0\.0\.1:3002/);

  await admin.auth.admin.deleteUser(created!.user!.id);
});

test('email OTP rejects an email with no existing account', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:3000/otp');
  await page
    .getByLabel('Email')
    .fill(`never-signed-up-${Date.now()}@example.com`);
  await expect(page.getByRole('button', { name: 'Send code' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Send code' }).click();

  await expect(page.getByText('No account found for that email')).toBeVisible();
  // Rejected before the "enter your code" step — no account should have been created.
  await expect(page.getByText('Enter your code')).not.toBeVisible();
});
