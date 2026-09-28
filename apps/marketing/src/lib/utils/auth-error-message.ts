/**
 * What an auth page says about the `error` a route sent it back with. A code
 * it doesn't know shows nothing, rather than the raw code.
 */
export function authErrorMessage(
  code: string | undefined,
  invitedEmail?: string,
): string | null {
  if (code === 'google_account_mismatch' && invitedEmail) {
    return `This invitation is for ${invitedEmail}, the Google account you chose uses a different address, so nothing was created. Continue with the Google account for ${invitedEmail}, or use this form.`;
  }
  if (code === 'oauth_failed')
    return "Google sign-in didn't finish. Try again.";
  return null;
}
