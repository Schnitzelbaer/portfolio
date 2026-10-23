import { isLocalDomain, normalizeDomain } from "./domain";

/** Absolute origin for the apex domain or a variant subdomain. */
export function originFor(domain: string | undefined, variant?: string): string {
  const apex = normalizeDomain(domain);
  const host = variant ? `${variant}.${apex}` : apex;
  return `${isLocalDomain(apex) ? "http" : "https"}://${host}`;
}
