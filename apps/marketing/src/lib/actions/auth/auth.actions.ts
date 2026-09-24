'use server';

import { createServerSupabaseClient } from '@repo/supabase/server';
import { joinCodeSchema } from '@repo/lib/schemas/organization';
import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_BYTES,
} from '@repo/lib/schemas/profile';

// Google serves avatars from googleusercontent.com. Pinning the host keeps this
// from becoming a server-side fetch of whatever URL happens to sit in
// raw_user_meta_data, which is provider-controlled rather than lectern's.
const ALLOWED_AVATAR_HOST_SUFFIX = '.googleusercontent.com';
const ALLOWED_AVATAR_MIME_TYPES = new Set<string>(AVATAR_ALLOWED_MIME_TYPES);

interface ResolveOrganizationMembershipResult {
  personalOrganizationId: string;
  joinedOrganizationId: string | null;
  joinCodeWasInvalid: boolean;
}

export async function resolveOrganizationMembershipAction(
  joinCode: string | null,
): Promise<ResolveOrganizationMembershipResult> {
  const supabase = await createServerSupabaseClient();

  // Every account gets its own free org-of-one, unconditionally — a join
  // code is always an ADDITIONAL membership on top of it, never a replacement.
  const { data: personalOrganizationId, error: ensureError } =
    await supabase.rpc('ensure_personal_organization');

  if (ensureError || !personalOrganizationId) {
    throw (
      ensureError ??
      new Error('Could not resolve an organization for this account')
    );
  }

  if (!joinCode) {
    return {
      personalOrganizationId,
      joinedOrganizationId: null,
      joinCodeWasInvalid: false,
    };
  }

  const parsedJoinCode = joinCodeSchema.safeParse(joinCode);
  if (!parsedJoinCode.success) {
    return {
      personalOrganizationId,
      joinedOrganizationId: null,
      joinCodeWasInvalid: true,
    };
  }

  const { data: joinedOrganizationId, error: joinError } = await supabase.rpc(
    'join_organization_by_code',
    { code: parsedJoinCode.data },
  );

  if (joinError || !joinedOrganizationId) {
    return {
      personalOrganizationId,
      joinedOrganizationId: null,
      joinCodeWasInvalid: true,
    };
  }

  return {
    personalOrganizationId,
    joinedOrganizationId,
    joinCodeWasInvalid: false,
  };
}

/**
 * Copies an OAuth provider's hosted avatar into our own bucket on first
 * sign-in, so it behaves exactly like an uploaded one from then on — signed
 * URLs, the co-member read policy, deletion with the account.
 *
 * Best-effort by design: every failure path returns quietly rather than
 * throwing, because a missing profile picture must never cost someone their
 * sign-in. Only ever seeds an empty avatar, so a later manual upload is never
 * overwritten on a subsequent Google sign-in.
 */
export async function importOAuthAvatarAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const remoteAvatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  if (!remoteAvatarUrl) return;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(remoteAvatarUrl);
  } catch {
    return;
  }
  if (parsedUrl.protocol !== 'https:') return;
  if (!parsedUrl.hostname.endsWith(ALLOWED_AVATAR_HOST_SUFFIX)) return;

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('avatar_path')
    .eq('id', user.id)
    .single();
  if (!profile || profile.avatar_path) return;

  let response: Response;
  try {
    response = await fetch(parsedUrl, { signal: AbortSignal.timeout(5_000) });
  } catch {
    return;
  }
  if (!response.ok) return;

  const contentType =
    response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!ALLOWED_AVATAR_MIME_TYPES.has(contentType)) return;

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > AVATAR_MAX_BYTES) return;

  const avatarPath = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(avatarPath, bytes, { upsert: true, contentType });
  if (uploadError) return;

  await supabase
    .from('member_profiles')
    .update({ avatar_path: avatarPath })
    .eq('id', user.id);
}
