import { test, expect } from '@playwright/test';

test('unconfirmed account is blocked from password sign-in, resend prompt shown', async ({
  page,
}) => {
  const email = `unconfirmed-${Date.now()}@example.com`;

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

  await page.goto('http://127.0.0.1:3000/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correcthorsebattery');
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByText('Resend confirmation email')).toBeVisible();
});
