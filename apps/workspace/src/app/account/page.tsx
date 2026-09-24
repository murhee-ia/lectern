import { createServerSupabaseClient } from '@repo/supabase/server';
import { formatRelativeDate } from '@repo/lib/utils/formatting';
import { SignOutButton } from '@repo/ui/components/customs/signout-button';
import { signOutAction } from '@repo/server/auth';

import { AvatarUpload } from '@/components/auth/avatar-upload';
import { ProfileForm } from '@/components/auth/profile-form';

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not signed in.');
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('display_name, first_name, last_name, avatar_path, created_at')
    .eq('id', user.id)
    .single();

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data: signedUrlData } = await supabase.storage
      .from('avatars')
      .createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = signedUrlData?.signedUrl ?? null;
  }

  const { count: organizationCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="heading-3 mb-2">Account</h1>

      <div className="glass-card mt-10">
        <AvatarUpload
          userId={user.id}
          initialAvatarUrl={avatarUrl}
          displayName={
            profile?.display_name || profile?.first_name || user.email || ''
          }
        />

        <div className="mt-6 space-y-1 text-sm">
          <p className="text-foreground/60">
            Email <span className="text-foreground ml-1">{user.email}</span>
          </p>
          <p className="text-foreground/60">
            Joined{' '}
            <span className="text-foreground ml-1">
              {formatRelativeDate(profile?.created_at ?? user.created_at)}
            </span>
          </p>
        </div>

        <div className="mt-6">
          <ProfileForm
            initialDisplayName={profile?.display_name ?? null}
            initialFirstName={profile?.first_name ?? null}
            initialLastName={profile?.last_name ?? null}
          />
        </div>
      </div>

      <div className="glass-card mt-6">
        <p className="text-sm text-foreground/70">
          You belong to{' '}
          <span className="font-semibold text-foreground">
            {organizationCount ?? 0}
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
