'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@repo/ui/components/ui/button';

const COPY_FEEDBACK_IN_MILLISECONDS = 2000;

const COPY_BUTTON_LABELS = {
  idle: 'Copy code',
  copied: 'Copied',
  failed: "Couldn't copy",
} as const;

/**
 * The organization's join code and a copy button. The button's own label
 * confirms the copy for now; that moves to a toast once toasts are wired.
 */
export function OrganizationJoinCodeCard({ joinCode }: { joinCode: string }) {
  const [copyStatus, setCopyStatus] =
    useState<keyof typeof COPY_BUTTON_LABELS>('idle');

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timeout = setTimeout(
      () => setCopyStatus('idle'),
      COPY_FEEDBACK_IN_MILLISECONDS,
    );
    return () => clearTimeout(timeout);
  }, [copyStatus]);

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopyStatus('copied');
    } catch {
      // The Clipboard API needs a secure context, which plain http on a LAN
      // address isn't — localhost and https both work.
      setCopyStatus('failed');
    }
  };

  return (
    <section
      aria-labelledby="organization-join-code-heading"
      className="glass-card flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="organization-join-code-heading"
          className="text-base font-semibold text-foreground"
        >
          Organization code
        </h3>
        <p className="text-sm text-foreground/60">
          Anyone with this code can join as a Member.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded-lg border border-lectern-white/15 bg-lectern-black/40 px-3 py-2 font-mono text-lg tracking-widest text-highlight">
          {joinCode}
        </code>
        <Button type="button" variant="outline" onClick={copyJoinCode}>
          {copyStatus === 'copied' ? <Check /> : <Copy />}
          {COPY_BUTTON_LABELS[copyStatus]}
        </Button>
      </div>
    </section>
  );
}
