import { parse } from "yaml";
import { normalizeDomain } from "../domain";
import type { RoutingInput } from "./rules";

/** Agent user agents from the raw content of `content/site.yaml`. */
export function agentUserAgents(siteYaml: string): string[] {
  const data = parse(siteYaml) as { agents?: { userAgents?: unknown } };
  return Array.isArray(data?.agents?.userAgents) ? data.agents.userAgents.map(String) : [];
}

export function routingInput(options: {
  domain: string | undefined;
  production: boolean;
  variants: Array<{ id: string; indexable: boolean }>;
  siteYaml: string;
}): RoutingInput {
  return {
    domain: normalizeDomain(options.domain),
    production: options.production,
    variants: options.variants,
    agentUserAgents: agentUserAgents(options.siteYaml),
  };
}
