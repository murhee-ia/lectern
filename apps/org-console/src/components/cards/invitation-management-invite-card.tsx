'use client';

import { Mail } from 'lucide-react';

import { useOrganizationAccess } from '@repo/lib/hooks/use-organization-access';
import { Button } from '@repo/ui/components/ui/button';

import { useOrganizationModal } from '@/lib/stores/organization-modal.store';

/** The way into the invite-by-email dialog. */
export function OrganizationInviteCard() {
  const { hasPermission } = useOrganizationAccess();
  const openModal = useOrganizationModal((state) => state.onOpen);

  if (!hasPermission('invites.manage')) return null;

  return (
    <section
      aria-labelledby="organization-invite-heading"
      className="glass-card flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="organization-invite-heading"
          className="text-base font-semibold text-foreground"
        >
          Invite by email
        </h3>
        <p className="text-sm text-foreground/60">
          Send someone a link to join. It stops working after 7 days.
        </p>
      </div>
      <Button
        type="button"
        className="self-start"
        onClick={() => openModal('inviteMember')}
      >
        <Mail />
        Invite by email
      </Button>
    </section>
  );
}
