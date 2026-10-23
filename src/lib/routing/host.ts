import { normalizeDomain } from "../domain";

/** Variant id for a request host like `acme.example.ch:443`, if it is a known variant. */
export function variantFromHost(
  host: string | null | undefined,
  domain: string | undefined,
  ids: string[],
): string | undefined {
  const hostname = (host ?? "").replace(/:\d+$/, "").toLowerCase();
  const apex = normalizeDomain(domain);
  if (!hostname.endsWith(`.${apex}`)) return undefined;
  const sub = hostname.slice(0, -(apex.length + 1));
  return ids.includes(sub) ? sub : undefined;
}
