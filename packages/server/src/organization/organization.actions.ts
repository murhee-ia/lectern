"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@repo/supabase/server";
import type { 
  OrganizationMember, 
  WorkspaceOrganization, 
  WorkspaceOrganizationMembership 
} from "@repo/types/organization";

const SELECTED_ORGANIZATION_COOKIE = "lectern_selected_organization_id";

export async function getWorkspaceOrganizationsAction(): Promise<{
  organizations: WorkspaceOrganizationMembership[];
  selectedOrganizationId: string;
}> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name, plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load organizations: ${error.message}`);
  }
  if (!memberships || memberships.length === 0) {
    throw new Error("No organization found for this account.");
  }

  const organizations: WorkspaceOrganizationMembership[] = memberships.map((membership) => ({
    id: membership.organization_id,
    name: membership.organizations?.name ?? "Untitled organization",
    plan: membership.organizations?.plan,
    role: membership.role,
  }));

  // Earliest membership is always the org-of-one
  const defaultOrganizationId = organizations[0]!.id;

  const cookieStore = await cookies();
  const cookieOrganizationId = cookieStore.get(SELECTED_ORGANIZATION_COOKIE)?.value;
  const selectedOrganizationId =
    cookieOrganizationId && organizations.some((organization) => organization.id === cookieOrganizationId)
      ? cookieOrganizationId
      : defaultOrganizationId;

  return { organizations, selectedOrganizationId };
}

export async function selectOrganizationAction(organizationId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!membership) {
    return { error: "You don't belong to that organization." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return {};
}

export async function getCurrentOrganizationOverviewAction(): Promise<{
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
    .select("organization_id, organizations(name, plan)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membershipError && membershipError.code !== "PGRST116") {
    throw new Error(`Failed to load the current organization: ${membershipError.message}`);
  }
  if (!membership || !membership.organizations) return null;

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
