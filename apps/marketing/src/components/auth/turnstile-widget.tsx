'use client';

import { useEffect, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

/**
 * Cloudflare's widget sizes are fixed: normal is 300x65, compact is 150x140.
 * At 300 the widget on its own floors the auth column at 382px once the card
 * and column padding are added — wider than a 320px or 360px phone, which is
 * how it came to overflow every auth page. Below 400px we render compact,
 * which clears the narrowest width we support with room to spare.
 *
 * Turnstile reads the size once, when it creates the widget, so changing it
 * has to remount the component — hence the key. Nothing renders until the
 * first effect has run, because the correct size is not knowable during a
 * server render and mounting at a guessed one would issue a challenge that
 * is immediately discarded.
 */
const COMPACT_BELOW = '(max-width: 399px)';

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const [size, setSize] = useState<'normal' | 'compact' | null>(null);

  useEffect(() => {
    const query = window.matchMedia(COMPACT_BELOW);
    const applySize = () => setSize(query.matches ? 'compact' : 'normal');

    applySize();
    query.addEventListener('change', applySize);
    return () => query.removeEventListener('change', applySize);
  }, []);

  if (!size) return null;

  return (
    <Turnstile
      key={size}
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      options={{ size }}
      onSuccess={onToken}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  );
}
