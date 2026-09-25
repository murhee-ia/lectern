import { requireCurrentUser } from '@repo/server/auth/queries';
import {
  getAvatarUrls,
  getCurrentMemberProfile,
} from '@repo/server/auth/profile/queries';
import { getCurrentMemberships } from '@repo/server/organization/queries';
import { resolveMemberDisplayName } from '@repo/lib/utils/organization';
import { formatRelativeDate } from '@repo/lib/utils/formatting';
import { SignOutButton } from '@repo/ui/components/customs/signout-button';
import { signOutAction } from '@repo/server/auth';

import { AvatarUpload } from '@/components/auth/avatar-upload';
import { ProfileForm } from '@/components/auth/profile-form';

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const [profile, memberships] = await Promise.all([
    getCurrentMemberProfile(),
    getCurrentMemberships(),
  ]);
  const avatarUrls = await getAvatarUrls([profile?.avatarPath ?? null]);
  const avatarUrl = profile?.avatarPath
    ? (avatarUrls.get(profile.avatarPath) ?? null)
    : null;
  const organizationCount = memberships.length;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="heading-3 mb-2">Account</h1>

      <div className="glass-card mt-10">
        <AvatarUpload
          userId={user.id}
          initialAvatarUrl={avatarUrl}
          displayName={
            profile ? resolveMemberDisplayName(profile) : ''
          }
        />

        <div className="mt-6 space-y-1 text-sm">
          <p className="text-foreground/60">
            Email <span className="text-foreground ml-1">{user.email}</span>
          </p>
          <p className="text-foreground/60">
            Joined{' '}
            <span className="text-foreground ml-1">
              {formatRelativeDate(profile?.createdAt ?? user.created_at)}
            </span>
          </p>
        </div>

        <div className="mt-6">
          <ProfileForm
            initialDisplayName={profile?.displayName ?? null}
            initialFirstName={profile?.firstName ?? null}
            initialLastName={profile?.lastName ?? null}
          />
        </div>
      </div>

      <div className="glass-card mt-6">
        <p className="text-sm text-foreground/70">
          You belong to{' '}
          <span className="font-semibold text-foreground">
            {organizationCount}
          </span>{' '}
          organization{organizationCount === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="mt-6">
        <SignOutButton action={signOutAction} />
      </div>
    </div>
  );
}
