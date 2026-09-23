const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "September 22, 2026" */
export function formatDateComplete(date: Date | string): string {
  return LONG_DATE_FORMATTER.format(new Date(date));
}

/** "Sep 22, 2026" */
export function formatDateCompact(date: Date | string): string {
  return SHORT_DATE_FORMATTER.format(new Date(date));
}

/**
 * "5 hours ago" for anything under 24 hours old (down to minute
 * granularity, "just now" under a minute); falls back to formatDateComplete
 * or formatDateCompact — pick with `fallback`, default "long" — once it's
 * a full day old or more, or if `date` is somehow in the future.
 */
export function formatRelativeDate(date: Date | string, fallback: "long" | "short" = "long"): string {
  const target = new Date(date);
  const elapsedMs = Date.now() - target.getTime();

  if (elapsedMs >= 0 && elapsedMs < DAY_MS) {
    if (elapsedMs < MINUTE_MS) return "just now";
    if (elapsedMs < HOUR_MS) {
      const minutes = Math.floor(elapsedMs / MINUTE_MS);
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return fallback === "long" ? formatDateComplete(target) : formatDateCompact(target);
}
