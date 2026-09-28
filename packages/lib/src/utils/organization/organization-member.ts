import type { MemberIdentity } from '@repo/types/auth';
import type { OrganizationRole } from '@repo/types/organization';

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
 * Every role, most to least privileged. Built from the rank map, whose type
 * requires every role in the database enum, so a new role can't be missing.
 */
export const ORGANIZATION_ROLES = (
  Object.keys(ORGANIZATION_ROLE_RANK) as OrganizationRole[]
).sort(compareOrganizationRoles);

/**
 * The name to show for a member: their display name, else their first and
 * last name. Same fallback order the signup trigger uses
 * when it resolves display_name, so a name never reads differently depending
 * on which screen shows it.
 */
export function resolveMemberDisplayName(
  member: Pick<MemberIdentity, 'displayName' | 'firstName' | 'lastName'>,
): string {
  const displayName = member.displayName?.trim();
  if (displayName) return displayName;

  const fullName = [member.firstName, member.lastName]
    .map((namePart) => namePart?.trim())
    .filter(Boolean)
    .join(' ');

  return fullName;
}

/**
 * The first letters of a name's first and last words: "Amara Okafor" → "AO",
 * "Amara Chidi Okafor" → "AO". A single word yields one letter.
 */
export function getNameInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initialWords = words.length > 1 ? [words[0], words.at(-1)] : words;

  return initialWords
    .map((word) => (word ? Array.from(word)[0] : ''))
    .join('')
    .toUpperCase();
}
