'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Mail } from 'lucide-react';

import { useOrganizationAccess } from '@repo/lib/hooks/use-organization-access';
import { invitationSchema } from '@repo/lib/schemas/organization';
import {
  DropdownSelectContent,
  DropdownSelectTrigger,
} from '@repo/ui/components/customs/dropdown-select';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@repo/ui/components/ui/dropdown-menu';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';

import { sendInvitationAction } from '@/lib/actions/invitations.actions';
import { useOrganizationModal } from '@/lib/stores/organization-modal.store';

// Never Admin: that role only moves through a handoff.
const INVITABLE_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'session_leader', label: 'Session leader' },
] as const;

type InvitableRole = (typeof INVITABLE_ROLES)[number]['value'];

/**
 * Invites someone by email. Results show here rather than as a toast: toasts
 * arrive with onboarding. Stays open after sending, so several people can be
 * invited in a row.
 */
export function OrganizationInviteDialog() {
  const isOpen = useOrganizationModal(
    (state) => state.isOpen && state.type === 'inviteMember',
  );
  const onClose = useOrganizationModal((state) => state.onClose);
  const { organization } = useOrganizationAccess();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleLabel = INVITABLE_ROLES.find(({ value }) => value === role)?.label;

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    setError(null);
    setSentTo(null);

    const parsed = invitationSchema.safeParse({ email, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the email and role.');
      return;
    }

    startTransition(async () => {
      const result = await sendInvitationAction(organization.id, parsed.data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSentTo(parsed.data.email);
      setEmail('');
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
        // Reopens blank on Member, so a role picked for one invitation is never
        // carried unnoticed into the next.
        setEmail('');
        setRole('member');
        setError(null);
        setSentTo(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Invite by email</DialogTitle>
            <DialogDescription>
              They&apos;ll get a link to join. It stops working after 7 days.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="invitation-email">Email</Label>
            <Input
              id="invitation-email"
              type="email"
              autoComplete="off"
              icon={<Mail />}
              placeholder="name@example.com"
              value={email}
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
              aria-invalid={error !== null}
            />
          </div>

          <div className="grid gap-2">
            <span id="invitation-role-label" className="text-sm font-medium">
              Role
            </span>
            <DropdownMenu>
              <DropdownSelectTrigger aria-labelledby="invitation-role-label">
                {roleLabel}
              </DropdownSelectTrigger>
              <DropdownSelectContent>
                <DropdownMenuRadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as InvitableRole)}
                >
                  {INVITABLE_ROLES.map(({ value, label }) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownSelectContent>
            </DropdownMenu>
          </div>

          <div aria-live="polite" className="min-h-5 text-sm">
            {error && <p className="text-destructive">{error}</p>}
            {sentTo && (
              <p className="text-foreground/70">
                Invitation sent to{' '}
                <span className="font-medium text-foreground">{sentTo}</span>.
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Done
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
