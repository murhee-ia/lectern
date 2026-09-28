'use client';

import Link from 'next/link';

import type {
  MemberTeamSessionActivity,
  TeamSessionSummary,
} from '@repo/types/session';
import { formatDateCompact } from '@repo/lib/utils/formatting/date';
import { MemberIdentity } from '@repo/ui/components/customs/member-identity';
import { OrganizationRoleBadge } from '@repo/ui/components/customs/organization-role-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';

import { useOrganizationModal } from '@/lib/stores/organization-modal.store';
import { canRoleStartTeamSessions } from '@/lib/utils/members/member-access';
import { teamSessionPath } from '@/lib/utils/organization-routes';

// There's no sessions table yet, so nobody has any activity to show. Loading a
// member's real activity replaces this once team sessions exist.
const NO_TEAM_SESSION_ACTIVITY: MemberTeamSessionActivity = {
  joined: [],
  started: [],
};

/** The team sessions one member joined, and — if their role can — started. */
export function OrganizationMemberActivityDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const isOpen = useOrganizationModal(
    (state) => state.isOpen && state.type === 'memberActivity',
  );
  const member = useOrganizationModal((state) => state.data?.member);
  const memberImageUrl = useOrganizationModal(
    (state) => state.data?.memberImageUrl,
  );
  const onClose = useOrganizationModal((state) => state.onClose);
  const activity = NO_TEAM_SESSION_ACTIVITY;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Team session activity</DialogTitle>
          <DialogDescription>
            Team sessions this member took part in, most recent first.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lectern-white/10 bg-lectern-white/5 p-3">
              <MemberIdentity
                member={member}
                imageUrl={memberImageUrl}
                size="lg"
              />
              <OrganizationRoleBadge role={member.role} />
            </div>

            <TeamSessionGroup
              heading="Joined"
              emptyMessage="Hasn't joined a team session yet."
              sessions={activity.joined}
              organizationId={organizationId}
              onNavigate={onClose}
            />
            {canRoleStartTeamSessions(member.role) && (
              <TeamSessionGroup
                heading="Started"
                emptyMessage="Hasn't started a team session yet."
                sessions={activity.started}
                organizationId={organizationId}
                onNavigate={onClose}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamSessionGroup({
  heading,
  emptyMessage,
  sessions,
  organizationId,
  onNavigate,
}: {
  heading: string;
  emptyMessage: string;
  sessions: TeamSessionSummary[];
  organizationId: string;
  onNavigate: () => void;
}) {
  const newestFirst = [...sessions].sort((first, second) =>
    second.startedAt.localeCompare(first.startedAt),
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">
        {heading}{' '}
        <span className="font-normal text-foreground/60">
          · {sessions.length} team session{sessions.length === 1 ? '' : 's'}
        </span>
      </h3>

      {newestFirst.length === 0 ? (
        <p className="text-sm text-foreground/60">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {newestFirst.map((session) => (
            <li key={session.id}>
              {/* The dialog lives in the layout, which survives navigation —
                  close it on the way out or it stays open over the next page. */}
              <Link
                href={teamSessionPath(organizationId, session.id)}
                onClick={onNavigate}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-lectern-white/10 hover:text-foreground"
              >
                <span className="min-w-0 truncate">{session.title}</span>
                <span className="shrink-0 text-xs text-foreground/60">
                  {formatDateCompact(session.startedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
