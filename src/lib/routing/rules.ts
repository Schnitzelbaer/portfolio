/**
 * Declarative request routing, the single source for:
 * - Vercel (serialized into `.vercel/output/config.json` by `scripts/vercel-routes.ts`),
 * - the dev server (interpreted in `src/middleware.ts`),
 * - the local production preview used by e2e tests (`scripts/preview-server.ts`).
 *
 * Semantics follow Vercel's Build Output API: `headers` rules apply and continue; the first
 * matching terminal rule (rewrite, redirect, status) wins.
 */

export interface Match {
  /** Regex source matched against the pathname. */
  path: string;
  /** Regex source matched against the hostname (without port). */
  host?: string;
  /** Regex source matched against a request header (lowercase key). */
  header?: { key: string; value: string };
}

export type Rule =
  | { kind: "headers"; match: Match; headers: Record<string, string>; note: string }
  | { kind: "rewrite"; match: Match; dest: string; note: string }
  | {
      kind: "redirect";
      match: Match;
      location: string;
      status: 301 | 302 | 307 | 308;
      note: string;
    }
  | { kind: "status"; match: Match; status: 404; note: string };

export interface RoutingInput {
  /** Apex domain, e.g. `example.ch`. */
  domain: string;
  /** Application variants: subdomain id and whether it may be indexed. */
  variants: Array<{ id: string; indexable: boolean }>;
  /** Production builds hide the internal `/v/` prefix. */
  production: boolean;
  /** User-Agent substrings of AI crawlers that get Markdown by default. Empty to disable. */
  agentUserAgents: string[];
}

/** Path prefixes that are shared by all hosts and never rewritten. */
export const PASSTHROUGH = ["_astro", "protected", "_image", "api", "_vercel", "_server-islands"];
export const VARIANT_PREFIX = "/v";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const passthrough = `(?!(?:${PASSTHROUGH.map(escapeRegex).join("|")})(?:/|$)|favicon\\.svg$)`;

/** Page paths: no file extension in the last segment, not a shared asset prefix. Captures the path without slashes. */
export const PAGE_PATH = `^/${passthrough}((?:[^/.]+/)*[^/.]+)/?$`;
export const ROOT_PATH = "^/$";
/** Anything except shared prefixes, captured without the leading slash. */
export const ANY_PATH = `^/${passthrough}(.*)$`;

const MARKDOWN_ACCEPT = { key: "accept", value: "text/markdown" };

export function buildRules(input: RoutingInput): Rule[] {
  const domain = escapeRegex(input.domain);
  const rules: Rule[] = [];
  const agents = input.agentUserAgents.map(escapeRegex).join("|");
  const negotiators: Array<{ header: Match["header"]; note: string }> = [
    { header: MARKDOWN_ACCEPT, note: "Accept: text/markdown" },
  ];
  if (agents)
    negotiators.push({
      header: { key: "user-agent", value: `(?:${agents})` },
      note: "known AI agent",
    });

  rules.push({
    kind: "headers",
    match: { path: `${PAGE_PATH}|${ROOT_PATH}` },
    headers: { Vary: agents ? "Accept, User-Agent" : "Accept" },
    note: "Pages are negotiated between HTML and Markdown",
  });
  for (const variant of input.variants) {
    if (variant.indexable) continue;
    rules.push({
      kind: "headers",
      match: { path: "^/.*$", host: `^${escapeRegex(variant.id)}\\.${domain}$` },
      headers: { "X-Robots-Tag": "noindex, nofollow" },
      note: `Variant ${variant.id} is not indexed`,
    });
  }
  if (input.production) {
    rules.push({
      kind: "status",
      match: { path: `^${VARIANT_PREFIX}(?:/.*)?$` },
      status: 404,
      note: "Variant pages are only reachable through their subdomain",
    });
  }
  rules.push({
    kind: "redirect",
    match: { path: "^/(.*)$", host: `^www\\.${domain}$` },
    location: `https://${input.domain}/$1`,
    status: 308,
    note: "www → apex",
  });

  for (const variant of input.variants) {
    const host = `^${escapeRegex(variant.id)}\\.${domain}$`;
    const base = `${VARIANT_PREFIX}/${variant.id}`;
    for (const { header, note } of negotiators) {
      rules.push({
        kind: "rewrite",
        match: { path: ROOT_PATH, host, ...(header && { header }) },
        dest: `${base}/index.md`,
        note: `${variant.id}: ${note}`,
      });
      rules.push({
        kind: "rewrite",
        match: { path: PAGE_PATH, host, ...(header && { header }) },
        dest: `${base}/$1.md`,
        note: `${variant.id}: ${note}`,
      });
    }
    rules.push({
      kind: "rewrite",
      match: { path: ROOT_PATH, host },
      dest: base,
      note: `${variant.id}: home`,
    });
    rules.push({
      kind: "rewrite",
      match: { path: ANY_PATH, host },
      dest: `${base}/$1`,
      note: `${variant.id}: subdomain → variant pages`,
    });
  }

  const known = input.variants.map((v) => escapeRegex(v.id)).join("|");
  rules.push({
    kind: "redirect",
    match: { path: ANY_PATH, host: `^${known ? `(?!(?:${known})\\.)` : ""}[^.]+\\.${domain}$` },
    location: `https://${input.domain}/`,
    status: 307,
    note: "Unknown subdomain → apex",
  });
  for (const { header, note } of negotiators) {
    rules.push({
      kind: "rewrite",
      match: { path: ROOT_PATH, ...(header && { header }) },
      dest: "/index.md",
      note,
    });
    rules.push({
      kind: "rewrite",
      match: { path: PAGE_PATH, ...(header && { header }) },
      dest: "/$1.md",
      note,
    });
  }
  return rules;
}
