/**
 * Creates an application variant: one config file, served at <id>.<SITE_DOMAIN>.
 *
 * Usage: npm run variant:new -- <id> --company "Acme AG" [--projects a,b,c] [--intro "Hello …"]
 *
 * Without --projects, all case studies are listed in their default order; delete or reorder lines.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { stringify } from "yaml";
import { RESERVED_VARIANT_IDS, VARIANT_ID } from "../src/lib/variants/schema";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    company: { type: "string" },
    projects: { type: "string" },
    intro: { type: "string" },
  },
});

const id = positionals[0]?.toLowerCase();
const fail = (message: string) => {
  console.error(`✗ ${message}`);
  console.error(
    'Usage: npm run variant:new -- <id> --company "Acme AG" [--projects a,b] [--intro "…"]',
  );
  process.exit(1);
};
if (!id) fail("Missing variant id (it becomes the subdomain).");
if (!VARIANT_ID.test(id ?? ""))
  fail(`"${id}" is not a valid subdomain. Use lowercase letters, digits and hyphens.`);
if (RESERVED_VARIANT_IDS.includes(id ?? "")) fail(`"${id}" is reserved.`);
if (!values.company) fail("Missing --company.");

const root = process.cwd();
const file = join(root, "content", "variants", `${id}.yaml`);
if (existsSync(file)) fail(`content/variants/${id}.yaml already exists.`);

const slugs = readdirSync(join(root, "content", "work")).filter((name) =>
  existsSync(join(root, "content", "work", name, "index.mdx")),
);
const projects = values.projects ? values.projects.split(",").map((s) => s.trim()) : slugs;
const unknown = projects.filter((p) => !slugs.includes(p));
if (unknown.length) fail(`Unknown case studies: ${unknown.join(", ")}. Known: ${slugs.join(", ")}`);

const yaml = stringify(
  {
    company: values.company,
    ...(values.intro && { intro: values.intro }),
    projects,
    analytics: true,
    indexable: false,
  },
  { lineWidth: 100 },
);
writeFileSync(
  file,
  `# Application variant, served at https://${id}.<SITE_DOMAIN> (noindex, not linked, not in the sitemap).\n# projects: case study slugs in display order. intro: optional personal note above the intro.\n${yaml}`,
);
console.log(`✓ content/variants/${id}.yaml`);
console.log(`  Preview: http://${id}.portfolio.localhost:4321 (npm run dev)`);
console.log(`  Check drafts: npm run check:drafts -- ${id}`);
