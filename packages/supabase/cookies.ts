/**
 * Auth cookies have to be readable by all three apps, which in production sit
 * on separate subdomains of one registrable domain and so need an explicit
 * Domain attribute. Locally they share 127.0.0.1 and differ only by port, where
 * a Domain attribute would be wrong hence undefined whenever the variable is
 * unset, rather than a hardcoded production hostname leaking into dev and into
 * every Vercel preview deployment.
 */
const configuredCookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();

export const SHARED_COOKIE_DOMAIN: string | undefined = configuredCookieDomain || undefined;

export const sharedCookieOptions = SHARED_COOKIE_DOMAIN
  ? { domain: SHARED_COOKIE_DOMAIN }
  : undefined;
