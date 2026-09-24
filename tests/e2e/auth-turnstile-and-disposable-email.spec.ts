import { test, expect } from '@playwright/test';

test('form rejects submission without a completed Turnstile challenge', async ({
  page,
}) => {
  await page.route('**/challenges.cloudflare.com/**', (route) => route.abort());

  await page.goto('http://127.0.0.1:3000/signup');
  await page.getByLabel('Email').fill(`blocked-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('correcthorsebattery');

  await expect(page.getByRole('button', { name: 'Sign up' })).toBeDisabled();
});

test('disposable-email domain is rejected inline before any signup request', async ({
  page,
}) => {
  let signUpRequestMade = false;
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/signup')) signUpRequestMade = true;
  });

  await page.goto('http://127.0.0.1:3000/signup');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('User');
  await page.getByLabel('Email').fill('someone@mailinator.com');
  await page.getByLabel('Password').fill('correcthorsebattery');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeEnabled({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page.getByText('disposable')).toBeVisible();
  expect(signUpRequestMade).toBe(false);
});
