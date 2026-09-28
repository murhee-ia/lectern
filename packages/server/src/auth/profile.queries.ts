import 'server-only';

import { cache } from 'react';
import { getCurrentUser } from '../auth/auth.queries';
import { createServerSupabaseClient } from '@repo/supabase/server';
import type {
  MemberIdentity,
  MemberIdentityRow,
  MemberProfile,
} from '@repo/types/auth';

// Server-side reads — not Server Actions. Each is called by Server Components
// and Server Actions on the server, never by the browser directly, so none
// carries 'use server' (which would publish it as a callable endpoint).
// Wrapping in React's cache() means a layout, a page, and a component that ask
// for the same thing during one request share a single round trip.

const AVATAR_URL_LIFETIME_IN_SECONDS = 60 * 60;

/**
 * The member_profiles columns behind a {@link MemberIdentity}. Any query that
 * shows the people its rows point at embeds exactly these —
 * `member_profiles(${MEMBER_IDENTITY_COLUMNS})` — and adds `email` only for
 * the org console's members list.
 */
export const MEMBER_IDENTITY_COLUMNS =
  'id, display_name, first_name, last_name, avatar_path';

/** An embedded member_profiles row, as the shape every screen shows. */
export function toMemberIdentity(row: MemberIdentityRow): MemberIdentity {
  return {
    userId: row.id,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarPath: row.avatar_path,
  };
}

/** The signed-in user's own profile, email included, or null when signed out. */
export const getCurrentMemberProfile = cache(
  async (): Promise<MemberProfile | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('member_profiles')
      .select(`${MEMBER_IDENTITY_COLUMNS}, email, created_at` as const)
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load your profile: ${error.message}`);
    }
    return data
      ? {
          ...toMemberIdentity(data),
          email: data.email,
          createdAt: data.created_at,
        }
      : null;
  },
);

/**
 * Signed URLs for avatars, keyed by storage path, in one request for the whole
 * batch — the bucket is private, so a path alone can't be rendered. Avatars
 * are cosmetic, so a failure yields no URLs rather than failing the page.
 */
export async function getAvatarUrls(
  avatarPaths: Array<string | null>,
): Promise<Map<string, string>> {
  const paths = [
    ...new Set(
      avatarPaths.filter((avatarPath): avatarPath is string =>
        Boolean(avatarPath),
      ),
    ),
  ];
  if (paths.length === 0) return new Map();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrls(paths, AVATAR_URL_LIFETIME_IN_SECONDS);

  if (error) return new Map();
  return new Map(
    data.flatMap((entry) =>
      entry.path && entry.signedUrl
        ? [[entry.path, entry.signedUrl] as const]
        : [],
    ),
  );
}
