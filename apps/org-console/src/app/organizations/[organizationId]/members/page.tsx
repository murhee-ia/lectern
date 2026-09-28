import { getAvatarUrls } from '@repo/server/auth/profile/queries';
import { getOrganizationMemberDetails } from '@repo/server/organization/queries';

import { OrganizationMemberTable } from '@/components/tables/members-table';
import { OrganizationSectionHeading } from '@/components/organization-section-heading';

export default async function OrganizationMembersPage({
  params,
}: PageProps<'/organizations/[organizationId]/members'>) {
  const { organizationId } = await params;
  const members = await getOrganizationMemberDetails(organizationId);
  const avatarUrls = await getAvatarUrls(
    members.map((member) => member.avatarPath),
  );

  return (
    <section className="flex flex-col gap-5">
      <OrganizationSectionHeading section="members" />
      <OrganizationMemberTable members={members} avatarUrls={avatarUrls} />
    </section>
  );
}
