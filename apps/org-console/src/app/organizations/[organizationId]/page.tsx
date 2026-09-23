import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationOverviewAction } from "@/lib/actions/organization/organization.actions";
import { OrganizationAllMembersTable } from "@/components/organization/organization-all-members-table";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const overview = await getOrganizationOverviewAction(organizationId);

  if (!overview) {
    notFound();
  }

  const { organization, members } = overview;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
        ← Organizations
      </Link>

      <h1 className="heading-3 mt-4">{organization.name}</h1>
      <div className="mt-2 flex gap-2">
        <span className="badge badge-highlight capitalize">{organization.plan} plan</span>
        <span className="badge">{members.length} member{members.length > 1 ? 's' : ''}</span>
      </div>

      <div className="glass-card mt-8">
        <h2 className="mb-4 font-semibold">Members</h2>
        <OrganizationAllMembersTable members={members} />
      </div>
    </div>
  );
}
