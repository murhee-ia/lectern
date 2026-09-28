import { OrganizationInviteDialog } from '@/components/dialogs/invite-email-dialog';
import { OrganizationMemberActivityDialog } from '@/components/dialogs/member-activity-dialog';

/**
 * Renders every dialog in an organization's console, once, from its layout.
 * useOrganizationModal decides which is open, so any page or component can
 * open one without mounting it.
 */
export function OrganizationModalHost({
  organizationId,
}: {
  organizationId: string;
}) {
  return (
    <>
      <OrganizationMemberActivityDialog organizationId={organizationId} />
      <OrganizationInviteDialog />
    </>
  );
}
