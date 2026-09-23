import { createServerSupabaseClient } from "@repo/supabase/server";
import { WorkspaceOrganization, OrganizationMember } from "@repo/types/organization";

export async function getOrganizationOverviewAction(organizationId: string): Promise<{
  organization: WorkspaceOrganization;
  members: OrganizationMember[];
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name, plan)")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Failed to load the organization: ${membershipError.message}`);
  }
  // Not a member, or a member but not Admin — same null result either way,
  // so a non-admin probing the URL can't tell an org exists from a 404.
  if (!membership || !membership.organizations || membership.role !== "admin") return null;

  const { data: memberRows, error: membersError } = await supabase
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(`Failed to load organization members: ${membersError.message}`);
  }

  const memberIds = (memberRows ?? []).map((memberRow) => memberRow.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("member_profiles")
    .select("id, email, first_name, last_name, display_name, avatar_path")
    .in("id", memberIds.length > 0 ? memberIds : [""]);

  if (profilesError) {
    throw new Error(`Failed to load member profiles: ${profilesError.message}`);
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const members: OrganizationMember[] = (memberRows ?? []).map((memberRow) => {
    const profile = profileById.get(memberRow.user_id);
    return {
      userId: memberRow.user_id,
      email: profile?.email ?? memberRow.user_id,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      displayName: profile?.display_name ?? null,
      avatarPath: profile?.avatar_path ?? null,
      role: memberRow.role,
      joinedAt: memberRow.created_at,
    };
  });

  return {
    organization: {
      id: membership.organization_id,
      name: membership.organizations.name,
      plan: membership.organizations.plan,
    },
    members,
  };
}
