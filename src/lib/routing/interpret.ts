import type { Rule } from "./rules";

export interface RoutingRequest {
  host: string;
  path: string;
  headers: Record<string, string | undefined>;
}

export type RoutingAction =
  | { type: "none" }
  | { type: "rewrite"; path: string }
  | { type: "redirect"; location: string; status: number }
  | { type: "status"; status: number };

export interface RoutingResult {
  action: RoutingAction;
  headers: Record<string, string>;
}

function test(pattern: string, value: string): RegExpExecArray | null {
  return new RegExp(pattern).exec(value);
}

/** Applies the routing table the way Vercel does: header rules accumulate, the first terminal rule wins. */
export function interpret(rules: Rule[], request: RoutingRequest): RoutingResult {
  const host = request.host.replace(/:\d+$/, "").toLowerCase();
  const headers: Record<string, string> = {};
  for (const rule of rules) {
    const { match } = rule;
    if (match.host && !test(match.host, host)) continue;
    if (match.header && !test(match.header.value, request.headers[match.header.key] ?? ""))
      continue;
    const result = test(match.path, request.path);
    if (!result) continue;
    const fill = (template: string) =>
      template.replace(/\$(\d)/g, (_, i) => result[Number(i)] ?? "");
    switch (rule.kind) {
      case "headers":
        Object.assign(headers, rule.headers);
        continue;
      case "rewrite":
        return { action: { type: "rewrite", path: fill(rule.dest) }, headers };
      case "redirect":
        return {
          action: { type: "redirect", location: fill(rule.location), status: rule.status },
          headers,
        };
      case "status":
        return { action: { type: "status", status: rule.status }, headers };
    }
  }
  return { action: { type: "none" }, headers };
}
