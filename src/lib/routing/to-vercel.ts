import type { Match, Rule } from "./rules";

/** A route in Vercel's Build Output API v3 (subset used here). */
export interface VercelRoute {
  src: string;
  dest?: string;
  status?: number;
  headers?: Record<string, string>;
  continue?: boolean;
  has?: Array<{ type: "host"; value: string } | { type: "header"; key: string; value: string }>;
}

function has(match: Match): VercelRoute["has"] {
  const conditions: NonNullable<VercelRoute["has"]> = [];
  if (match.host) conditions.push({ type: "host", value: match.host });
  if (match.header)
    conditions.push({ type: "header", key: match.header.key, value: `.*${match.header.value}.*` });
  return conditions.length ? conditions : undefined;
}

export function toVercelRoutes(rules: Rule[]): VercelRoute[] {
  return rules.map((rule): VercelRoute => {
    const base = { src: rule.match.path, ...(has(rule.match) && { has: has(rule.match) }) };
    switch (rule.kind) {
      case "headers":
        return { ...base, headers: rule.headers, continue: true };
      case "rewrite":
        return { ...base, dest: rule.dest };
      case "redirect":
        return { ...base, status: rule.status, headers: { Location: rule.location } };
      case "status":
        return { ...base, status: rule.status, dest: "/404.html" };
      default:
        throw new Error(`Unknown rule kind: ${JSON.stringify(rule)}`);
    }
  });
}
