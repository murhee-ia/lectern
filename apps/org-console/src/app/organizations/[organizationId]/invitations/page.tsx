import { notFound } from 'next/navigation';
import {
  getOrganizationSettings,
  getOrganizationInvitations,
} from '@repo/server/organization/queries';

import { OrganizationInvitationTable } from '@/components/tables/invitations-table';
import { OrganizationInviteCard } from '@/components/cards/invitation-management-invite-card';
import { OrganizationJoinCodeCard } from '@/components/cards/invitation-management-join-code-card';
import { OrganizationSectionHeading } from '@/components/organization-section-heading';
import { describeInvitations } from '@/lib/utils/invitations/invitation-status';

export default async function OrganizationInvitationsPage({
  params,
}: PageProps<'/organizations/[organizationId]/invitations'>) {
  const { organizationId } = await params;
  const [settings, invitations] = await Promise.all([
    getOrganizationSettings(organizationId),
    getOrganizationInvitations(organizationId),
  ]);
  if (!settings) notFound();

  // One timestamp for the whole render, so every row agrees on what "now" is.
  // The purity rule guards against a component re-rendering with a different
  // clock value; a Server Component renders once per request and never
  // re-renders on the client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <section className="flex flex-col gap-5">
      <OrganizationSectionHeading section="invitations" />
      <div className="grid gap-4 md:grid-cols-2">
        <OrganizationJoinCodeCard joinCode={settings.joinCode} />
        <OrganizationInviteCard />
      </div>
      <OrganizationInvitationTable
        invitations={describeInvitations(invitations, now)}
      />
    </section>
  );
}
