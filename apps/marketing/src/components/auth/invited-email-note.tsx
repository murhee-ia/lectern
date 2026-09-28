'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui/components/ui/button';

/**
 * Under a locked email field, for someone opening an invitation: only the
 * invited address can accept it, so it isn't editable. Anyone else starts a
 * plain sign-in instead.
 */
export function InvitedEmailNote() {
  const router = useRouter();

  return (
    <p className="text-xs text-foreground/60">
      Your invitation was sent to this address.{' '}
      <Button
        type="button"
        variant="link"
        className="h-auto p-0 text-xs"
        onClick={() => router.push('/signin')}
      >
        Not you?
      </Button>
    </p>
  );
}
