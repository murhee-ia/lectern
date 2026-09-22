import { cn } from "cn";

export function LecternLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        // Purple carries the badge — it's the product's main color — with a
        // two-yellow gradient reserved for the "L" itself, the one playful
        // pop against it.
        "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-lectern-accent-purple via-lectern-accent-purple to-lectern-primary-purple shadow-glass-sm",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-lectern-light-purple/30 via-transparent to-transparent"
      />
      <span className="relative bg-gradient-to-br from-highlight to-highlight-secondary bg-clip-text font-heading text-2xl font-bold text-transparent">
        L
      </span>
    </div>
  );
}
