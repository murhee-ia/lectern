import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@repo/supabase/server';

// Server-side reads — not Server Actions. Each is called by Server Components
// and Server Actions on the server, never by the browser directly, so none
// carries 'use server' (which would publish it as a callable endpoint).
// Wrapping in React's cache() means a layout, a page, and a component that ask
// for the same thing during one request share a single round trip.

/** The signed-in user, verified with the Auth server, or null. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The signed-in user, for anything that can't render signed out. The proxy
 * already redirects signed-out requests; this covers a session that lapses
 * between the proxy running and the page rendering.
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL}/signin`);
  return user;
}
