const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_MARKETING_URL,
  process.env.NEXT_PUBLIC_WORKSPACE_URL,
  process.env.NEXT_PUBLIC_ORG_CONSOLE_URL,
].filter((url): url is string => Boolean(url));

/**
 * Resolves a redirect target that may have come from a query parameter
 * (`?next=`, `?redirect_to=`) to a known-safe URL, falling back otherwise.
 * Without this, an auth flow that echoes such a parameter straight into a
 * redirect is an open redirect: anyone holding a valid token for their own
 * account could send someone else a lectern.app link that, after a genuine
 * successful auth step, bounces them to an attacker-controlled site.
 */
export function resolveSafeRedirect(candidate: string | null | undefined, fallback: string): string {
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate, fallback);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;

    const isAllowed = ALLOWED_ORIGINS.some((origin) => url.origin === new URL(origin).origin);
    return isAllowed ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
