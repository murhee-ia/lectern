import disposableDomains from "disposable-email-domains";

const disposableDomainSet = new Set(disposableDomains);

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain ? disposableDomainSet.has(domain) : false;
}
