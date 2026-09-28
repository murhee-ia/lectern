import type { Database } from '@repo/supabase/types';

/**
 * A `member_profiles` row exactly as the database returns it, snake_case and
 * all. Only the queries that read the table use it; everything else gets a
 * {@link MemberIdentity} or a {@link MemberProfile}.
 */
export type MemberProfileRow =
  Database['public']['Tables']['member_profiles']['Row'];

/** The `member_profiles` columns a {@link MemberIdentity} is built from. */
export type MemberIdentityRow = Pick<
  MemberProfileRow,
  'id' | 'display_name' | 'first_name' | 'last_name' | 'avatar_path'
>;

/**
 * How a member is shown wherever they appear: their avatar, and the name
 * fields resolveMemberDisplayName() reads — the display name, falling back to
 * first and last name. No email: an address is shown only on the org
 * console's members list and on the member's own account page, which add it
 * themselves.
 */
export type MemberIdentity = {
  userId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarPath: string | null;
};

/**
 * A member's whole profile, as their own account page shows it — the one
 * place in the workspace their email appears.
 */
export type MemberProfile = MemberIdentity & {
  email: string;
  createdAt: string;
};
