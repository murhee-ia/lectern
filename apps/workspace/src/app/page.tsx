import { createServerSupabaseClient } from "@repo/supabase/server";
import { getWorkspaceOrganizationsAction } from "@repo/server/organization";
import { OrganizationSummaryCard } from "@/components/organization/organization-summary-card";

export default async function WorkspaceHomePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; joinedOrganizationId?: string }>;
}) {
  const { notice, joinedOrganizationId } = await searchParams;
  const { organizations, selectedOrganizationId } = await getWorkspaceOrganizationsAction();

  const joinedOrganization = organizations.find(
    (organization) => organization.id === joinedOrganizationId,
  );

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("display_name, first_name")
    .eq("id", user.id)
    .single();

  const greetingName = profile?.display_name || profile?.first_name;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      {notice === "invalid_join_code" && (
        <div className="glass-card info-box mb-8">
          <p className="text-sm text-foreground/90">
            The organization code you entered wasn&apos;t valid, so only your free personal
            organization was created. You can join an organization later with a valid code, or
            upgrade to a paid plan to create a new one and invite members.
          </p>
        </div>
      )}
      {notice === "joined_organization" && (
        <div className="glass-card info-box mb-8">
          <p className="text-sm text-foreground/90">
            You&apos;ve joined{" "}
            {joinedOrganization ? <strong>{joinedOrganization.name}</strong> : "that organization"},
            alongside your own free personal organization.
          </p>
        </div>
      )}

      <OrganizationSummaryCard
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
      />

      <div className="mt-8">
        <h2 className="heading-3">Welcome{greetingName ? `, ${greetingName}` : ""}</h2>
        <p className="mt-2 text-foreground/70">
          Your workspace is ready — personal and team sessions arrive in a later phase.
        </p>
      </div>
    </div>
  );
}
