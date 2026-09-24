import type {
  OrganizationMember,
  OrganizationRole,
} from '@repo/types/organization';

const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  admin: 'Admin',
  session_leader: 'Session leader',
  member: 'Member',
};

// Most to least privileged — the order roles are listed in wherever they sort.
const ORGANIZATION_ROLE_RANK: Record<OrganizationRole, number> = {
  admin: 0,
  session_leader: 1,
  member: 2,
};

/** "session_leader" → "Session leader". */
export function formatOrganizationRole(role: OrganizationRole): string {
  return ORGANIZATION_ROLE_LABELS[role];
}

/** Sorts Admin first, then Session leader, then Member. */
export function compareOrganizationRoles(
  first: OrganizationRole,
  second: OrganizationRole,
): number {
  return ORGANIZATION_ROLE_RANK[first] - ORGANIZATION_ROLE_RANK[second];
}

/**
 * The name to show for a member: their display name, else their first and
 * last name. Same fallback order the signup trigger uses
 * when it resolves display_name, so a name never reads differently depending
 * on which screen shows it.
 */
export function resolveMemberDisplayName(
  member: Pick<
    OrganizationMember,
    'displayName' | 'firstName' | 'lastName'
  >,
): string {
  const displayName = member.displayName?.trim();
  if (displayName) return displayName;

  const fullName = [member.firstName, member.lastName]
    .map((namePart) => namePart?.trim())
    .filter(Boolean)
    .join(' ');

  return fullName;
}

/** "Amara Okafor" → "AO"; a single word yields one letter. */
export function getNameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
