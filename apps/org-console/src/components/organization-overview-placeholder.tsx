const PLACEHOLDER_COUNTS = [
  'Members',
  'Team sessions this cycle',
  'Pending invitations',
];

const PLACEHOLDER_LISTS = ['Scheduled team sessions', 'Active team sessions'];

/**
 * Where the dashboard's charts, counts, and live team-session status will go.
 * Deliberately static rather than a pulsing skeleton: nothing is loading, and
 * a skeleton would promise content that isn't coming yet.
 */
export function OrganizationOverviewPlaceholder({
  className = '',
}: {
  className?: string;
}) {
  return (
    <section
      aria-labelledby="organization-overview-heading"
      className={`glass-card flex flex-col gap-5 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h2
          id="organization-overview-heading"
          className="text-xl font-semibold text-foreground"
        >
          Overview
        </h2>
        <p className="text-sm text-foreground/60">
          Charts, counts, and live team-session status will appear here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PLACEHOLDER_COUNTS.map((label) => (
          <div
            key={label}
            className="rounded-xl border border-dashed border-lectern-white/15 p-4"
          >
            <p className="text-xs text-foreground/50">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground/25">—</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {PLACEHOLDER_LISTS.map((label) => (
          <div
            key={label}
            className="flex min-h-32 flex-col rounded-xl border border-dashed border-lectern-white/15 p-4"
          >
            <p className="text-sm font-medium text-foreground/80">{label}</p>
            <p className="mt-auto text-xs text-foreground/40">Coming later</p>
          </div>
        ))}
      </div>
    </section>
  );
}
