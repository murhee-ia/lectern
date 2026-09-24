'use client';

import { Turnstile } from '@marsidev/react-turnstile';

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  return (
    <Turnstile
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      onSuccess={onToken}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  );
}
