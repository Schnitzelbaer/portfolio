/** Fallback apex domain for local development. Subdomains of `*.localhost` resolve to loopback. */
export const DEFAULT_DOMAIN = "portfolio.localhost";

export function normalizeDomain(raw: string | undefined): string {
  const domain = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return domain || DEFAULT_DOMAIN;
}

export function isLocalDomain(domain: string): boolean {
  return domain === "localhost" || domain.endsWith(".localhost") || domain.startsWith("127.");
}

/** Absolute origin for the apex domain, e.g. `https://example.ch`. */
export function siteUrl(raw: string | undefined): string {
  const domain = normalizeDomain(raw);
  return `${isLocalDomain(domain) ? "http" : "https"}://${domain}`;
}
