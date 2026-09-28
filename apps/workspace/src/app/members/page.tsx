import { getAvatarUrls } from '@repo/server/auth/profile/queries';
import {
  getOrganizationMembers,
  getOrganizationSelection,
} from '@repo/server/organization/queries';

import { OrganizationMemberDirectoryTable } from '@/components/organization/member-directory-table';

export default async function MembersPage() {
  const { selectedOrganization } = await getOrganizationSelection();
  const members = await getOrganizationMembers(selectedOrganization.id);
  const avatarUrls = await getAvatarUrls(
    members.map((member) => member.avatarPath),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-4 pb-16 sm:pt-8">
      <div className="flex flex-col gap-1">
        <h1 className="heading-3">Members</h1>
        <p className="text-sm text-foreground/70">
          Everyone in{' '}
          <span className="font-medium text-foreground">
            {selectedOrganization.name}
          </span>
          .
        </p>
      </div>
      <OrganizationMemberDirectoryTable
        members={members}
        avatarUrls={avatarUrls}
      />
    </div>
  );
}
