import type { MemberIdentity as MemberIdentityShape } from '@repo/types/auth';
import { resolveMemberDisplayName } from '@repo/lib/utils/organization';
import { MemberAvatar } from '@repo/ui/components/customs/member-avatar';

/**
 * Avatar and name — the one way a member is identified on every screen, so a
 * person's name never resolves differently between apps. `showEmail` is set
 * only by the org console's members list, the one screen allowed to show
 * another member's email; everywhere else the data doesn't even carry it.
 */
export function MemberIdentity({
  member,
  imageUrl,
  showEmail = false,
  size = 'sm',
}: {
  member: Pick<
    MemberIdentityShape,
    'displayName' | 'firstName' | 'lastName'
  > & { email?: string };
  imageUrl?: string | null;
  showEmail?: boolean;
  size?: 'sm' | 'lg';
}) {
  const name = resolveMemberDisplayName(member);
  const email = showEmail ? member.email : null;

  return (
    <span className="flex min-w-0 items-center gap-3">
      <MemberAvatar name={name} imageUrl={imageUrl} size={size} />
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate font-medium text-foreground">{name}</span>
        {email && (
          <span className="truncate text-xs text-foreground/60">{email}</span>
        )}
      </span>
    </span>
  );
}
