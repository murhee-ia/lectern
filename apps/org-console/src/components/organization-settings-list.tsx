import type { ReactNode } from 'react';

import { Button } from '@repo/ui/components/ui/button';

/**
 * The organization's settings. Every button is deliberately inert for now —
 * each gets a dialog once its action is built.
 */
export function OrganizationSettingsList({ joinCode }: { joinCode: string }) {
  return (
    <div className="flex flex-col gap-4">
      <SettingsGroup heading="General">
        <SettingRow
          title="Organization name"
          description="Shown to every member, and on the invitations you send."
          actionLabel="Edit name"
        />
        <SettingRow
          title="Organization code"
          description={
            <>
              Anyone with{' '}
              <code className="font-mono text-highlight">{joinCode}</code> can
              join as a Member. A new code stops the old one working
              immediately.
            </>
          }
          actionLabel="Regenerate code"
        />
        <SettingRow
          title="Admin role"
          description="Hand the Admin role to another member. You become a Member once they accept."
          actionLabel="Hand off admin role"
        />
      </SettingsGroup>

      <SettingsGroup heading="Danger zone" isDestructive>
        <SettingRow
          title="Remove all members"
          description="Everyone but you leaves the organization. Their own personal organizations are untouched."
          actionLabel="Remove all members"
          isDestructive
        />
        <SettingRow
          title="Leave organization"
          description="As the Admin, you can leave only after handing off the admin role."
          actionLabel="Leave organization"
          isDestructive
        />
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({
  heading,
  isDestructive = false,
  children,
}: {
  heading: string;
  isDestructive?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`glass-card flex flex-col p-0 ${isDestructive ? 'border-destructive/40' : ''}`}
    >
      <h3
        className={`px-5 pt-5 text-base font-semibold ${isDestructive ? 'text-destructive' : 'text-foreground'}`}
      >
        {heading}
      </h3>
      <ul className="divide-y divide-lectern-white/10">{children}</ul>
    </section>
  );
}

function SettingRow({
  title,
  description,
  actionLabel,
  isDestructive = false,
}: {
  title: string;
  description: ReactNode;
  actionLabel: string;
  isDestructive?: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-foreground/60">{description}</p>
      </div>
      <Button
        type="button"
        variant={isDestructive ? 'destructive' : 'outline'}
        className="shrink-0 self-start sm:self-auto"
      >
        {actionLabel}
      </Button>
    </li>
  );
}
