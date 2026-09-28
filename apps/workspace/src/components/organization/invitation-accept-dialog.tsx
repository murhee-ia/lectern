'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';

import {
  acceptInvitationAction,
  openOrganizationAction,
  signOutToInvitationAction,
} from '@/lib/actions/invitations.actions';

/** Which of its four faces the dialog shows, worked out on the server. */
export type InvitationAcceptView =
  | {
      kind: 'ready';
      invitationToken: string;
      organizationName: string;
      inviterName: string;
      roleLabel: string;
    }
  | { 
    kind: 'already-member'; 
    organizationId: string; 
    organizationName: string 
    }
  | {
      kind: 'wrong-account';
      invitationToken: string;
      inviteeEmail: string;
      signedInEmail: string;
    }
  | { kind: 'unavailable'; organizationName: string | null };

/**
 * The dialog an invitation link ends on. It can't be closed or dismissed: the
 * only way on is Accept. Someone who doesn't want the organization accepts
 * and leaves it. When Accept can't work, the dialog's one button is the way
 * out instead.
 */
export function InvitationAcceptDialog({
  view,
}: {
  view: InvitationAcceptView;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Each action redirects when it succeeds, so only an error comes back.
  const run = (action: () => Promise<{ error?: string } | void>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(keyEvent) => keyEvent.preventDefault()}
        onInteractOutside={(pointerEvent) => pointerEvent.preventDefault()}
        className="sm:max-w-md"
      >
        {view.kind === 'ready' && (
          <>
            <DialogHeader>
              <DialogTitle>Join {view.organizationName}</DialogTitle>
              <DialogDescription>
                {view.inviterName || 'An Admin'} invited you to join{' '}
                <span className="font-medium text-foreground">
                  {view.organizationName}
                </span>{' '}
                as a {view.roleLabel}.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => acceptInvitationAction(view.invitationToken))
                }
              >
                {isPending ? 'Joining…' : 'Accept invitation'}
              </Button>
            </DialogFooter>
          </>
        )}

        {view.kind === 'already-member' && (
          <>
            <DialogHeader>
              <DialogTitle>
                You already belong to {view.organizationName}
              </DialogTitle>
              <DialogDescription>
                There&apos;s nothing to accept: you&apos;re already a member.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => openOrganizationAction(view.organizationId))
                }
              >
                Go to {view.organizationName}
              </Button>
            </DialogFooter>
          </>
        )}

        {view.kind === 'wrong-account' && (
          <>
            <DialogHeader>
              <DialogTitle>
                This invitation is for {view.inviteeEmail}
              </DialogTitle>
              <DialogDescription>
                You&apos;re signed in as {view.signedInEmail}. Only{' '}
                {view.inviteeEmail} can accept it, so sign out and continue with
                that address.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => signOutToInvitationAction(view.invitationToken))
                }
              >
                {isPending ? 'Signing out…' : 'Sign out and continue'}
              </Button>
            </DialogFooter>
          </>
        )}

        {view.kind === 'unavailable' && (
          <>
            <DialogHeader>
              <DialogTitle>This invitation link no longer works</DialogTitle>
              <DialogDescription>
                It expired, was canceled, or was already used. Ask{' '}
                {view.organizationName
                  ? `${view.organizationName}'s Admin`
                  : 'whoever invited you'}{' '}
                to send it again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button asChild>
                <Link href="/">Go to workspace</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
