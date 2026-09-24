/**
 * A `member_profiles` row — the public mirror of `auth.users`, readable by the
 * user themselves and by anyone they share an organization with.
 */
export type MemberProfile = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarPath: string | null;
  createdAt: string;
};
