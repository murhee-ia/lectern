/**
 * Google sign-in for someone opening an invitation, which Lectern runs itself
 * so it can check the Google account's address before any account exists.
 */
export const GOOGLE_INVITATION_START_PATH = '/auth/invitation/google';
export const GOOGLE_INVITATION_CALLBACK_PATH =
  '/auth/invitation/google/callback';

/** Carries the flow's state, invitation, and join code to Google and back. */
export const GOOGLE_INVITATION_COOKIE = 'lectern-google-invitation';
