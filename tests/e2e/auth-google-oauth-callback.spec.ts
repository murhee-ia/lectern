import { test, expect } from '@playwright/test';

test('Google OAuth callback handling (network-mocked)', async ({ page }) => {
  // Mock Supabase's own OAuth authorize redirect instead of hitting real Google.
  await page.route('**/auth/v1/authorize**', (route) => {
    const callbackUrl =
      'http://127.0.0.1:3000/auth/callback?code=mocked-oauth-code';
    route.fulfill({ status: 302, headers: { Location: callbackUrl } });
  });

  await page.goto('http://127.0.0.1:3000/signin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  // With a genuinely fake code, exchangeCodeForSession fails — assert the
  // app's own error handling path (redirect back to /signin) fires correctly,
  // proving *your* callback route handles a bad exchange gracefully.
  await expect(page).toHaveURL(/signin\?error=oauth_failed/);
});
