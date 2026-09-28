import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

/**
 * Holds the place of a page that's routed but not yet designed, so every link
 * that leads there lands somewhere intentional instead of a 404.
 */
export function ComingLaterPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Construction aria-hidden className="size-8 text-highlight" />
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-foreground/70">{children}</p>
    </section>
  );
}
