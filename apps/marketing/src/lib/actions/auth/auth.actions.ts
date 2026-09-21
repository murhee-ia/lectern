"use server";

import { createServerSupabaseClient } from "@repo/supabase/server";

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
  const { data: personalOrganizationId, error: ensureError } = await supabase.rpc(
    "ensure_personal_organization",
  );

  if (ensureError || !personalOrganizationId) {
    throw ensureError ?? new Error("Could not resolve an organization for this account");
  }

  if (!joinCode) {
    return { personalOrganizationId, joinedOrganizationId: null, joinCodeWasInvalid: false };
  }

  const { data: joinedOrganizationId, error: joinError } = await supabase.rpc(
    "join_organization_by_code",
    { code: joinCode },
  );

  if (joinError || !joinedOrganizationId) {
    return { personalOrganizationId, joinedOrganizationId: null, joinCodeWasInvalid: true };
  }

  return { personalOrganizationId, joinedOrganizationId, joinCodeWasInvalid: false };
}
