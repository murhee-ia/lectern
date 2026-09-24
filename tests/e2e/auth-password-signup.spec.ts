import { test, expect } from '@playwright/test';
import { getLatestEmailLinkFor } from './utils/inbucket';

test('password signup → Inbucket confirmation link → account active', async ({
  page,
}) => {
  const email = `signup-${Date.now()}@example.com`;

  await page.goto('http://127.0.0.1:3000/signup');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correcthorsebattery');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page.getByText('Check your email')).toBeVisible();

  const confirmationLink = await getLatestEmailLinkFor(
    email,
    /http:\/\/127\.0\.0\.1:3000\/auth\/confirm[^"<\s]*/,
  );
  await page.goto(confirmationLink);

  await expect(page).toHaveURL(/127\.0\.0\.1:3002/);
});
