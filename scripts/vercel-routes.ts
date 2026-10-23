/**
 * Post-build step: prepends the routing table (src/lib/routing/rules.ts) to Vercel's
 * Build Output config, so subdomains, content negotiation and headers work on Vercel.
 * Runs automatically as part of `npm run build`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { routingInput } from "../src/lib/routing/input";
import { buildRules } from "../src/lib/routing/rules";
import { toVercelRoutes } from "../src/lib/routing/to-vercel";
import { loadVariantsFromDisk } from "../src/lib/variants/disk";

const root = process.cwd();
const configPath = join(root, ".vercel", "output", "config.json");
if (!existsSync(configPath)) {
  console.error("No .vercel/output/config.json. Run astro build with the Vercel adapter first.");
  process.exit(1);
}

const input = routingInput({
  domain: process.env.SITE_DOMAIN,
  production: process.env.VERCEL_ENV === "production" || process.env.ROUTING_PRODUCTION === "1",
  variants: loadVariantsFromDisk(root).map((v) => ({ id: v.id, indexable: v.indexable })),
  siteYaml: readFileSync(join(root, "content", "site.yaml"), "utf8"),
});
const routes = toVercelRoutes(buildRules(input));
const config = JSON.parse(readFileSync(configPath, "utf8")) as { routes?: unknown[] };
// Remember how many routes were prepended, so running the script twice does not duplicate them.
const markerPath = join(root, ".vercel", "output", ".portfolio-routes.json");
const previous = existsSync(markerPath)
  ? (JSON.parse(readFileSync(markerPath, "utf8")) as unknown[])
  : [];
let existing = config.routes ?? [];
if (
  previous.length &&
  JSON.stringify(existing.slice(0, previous.length)) === JSON.stringify(previous)
) {
  existing = existing.slice(previous.length);
}
config.routes = [...routes, ...existing];
writeFileSync(markerPath, JSON.stringify(routes));
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  `[routing] ${routes.length} routes for ${input.domain} (${input.variants.length} variants, production: ${input.production})`,
);
