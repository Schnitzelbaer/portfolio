/**
 * Imports a Notion Markdown export as a case study.
 *
 * Usage: npm run import:notion -- <export.zip | export-folder | page.md> [--slug my-case] [--force]
 *
 * Writes content/work/<slug>/index.mdx and copies all images to content/work/<slug>/images/.
 * In Notion: Export → Markdown & CSV, "Include subpages" off.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";
import { convertNotionMarkdown, slugify } from "../src/lib/notion/convert";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { slug: { type: "string" }, force: { type: "boolean", default: false } },
});

const input = positionals[0];
if (!input) {
  console.error(
    "Usage: npm run import:notion -- <export.zip | folder | page.md> [--slug name] [--force]",
  );
  process.exit(1);
}

/** Unzips (also nested zips, which Notion produces for larger exports) into a temp folder. */
function unpack(path: string): string {
  const dir = mkdtempSync(join(tmpdir(), "notion-"));
  execFileSync("unzip", ["-q", path, "-d", dir]);
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".zip")) execFileSync("unzip", ["-q", "-o", join(dir, name), "-d", dir]);
  }
  return dir;
}

function findPages(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile() && path.endsWith(".md")) return [path];
  if (stat.isFile() && path.endsWith(".zip")) return findPages(unpack(path));
  if (!stat.isDirectory()) throw new Error(`Not a .zip, .md or folder: ${path}`);
  const pages = readdirSync(path)
    .filter((name) => name.endsWith(".md"))
    .map((name) => join(path, name));
  if (pages.length) return pages;
  // Some exports wrap everything in one extra folder.
  const dirs = readdirSync(path).filter((name) => statSync(join(path, name)).isDirectory());
  return dirs.flatMap((name) => findPages(join(path, name)));
}

const root = process.cwd();
const site = parseYaml(readFileSync(join(root, "content", "site.yaml"), "utf8")) as {
  name?: string;
};
const pages = findPages(resolve(input));
if (!pages.length) {
  console.error("No Markdown page found in the export.");
  process.exit(1);
}
if (values.slug && pages.length > 1) {
  console.error("--slug only works when the export contains a single page.");
  process.exit(1);
}

let failed = false;
for (const page of pages) {
  const result = convertNotionMarkdown(readFileSync(page, "utf8"), { author: site.name ?? "" });
  const title = String(result.frontmatter.title);
  const slug = values.slug ?? (slugify(title.replace("[...]", "")) || "untitled");
  const target = join(root, "content", "work", slug);
  if (existsSync(join(target, "index.mdx")) && !values.force) {
    console.error(
      `✗ content/work/${slug}/index.mdx exists. Use --force to overwrite or --slug for a new name.`,
    );
    failed = true;
    continue;
  }
  mkdirSync(join(target, "images"), { recursive: true });
  for (const image of result.images) {
    const from = join(dirname(page), image.source);
    if (!existsSync(from)) {
      result.warnings.push(`Image not found in export: ${image.source}`);
      continue;
    }
    copyFileSync(from, join(target, "images", image.target));
  }
  writeFileSync(join(target, "index.mdx"), result.mdx);
  console.log(`✓ ${title} → content/work/${slug}/index.mdx (${result.images.length} images)`);
  for (const warning of result.warnings) console.log(`  ! ${warning}`);
}
if (!failed) console.log("Next: npm run dev, then npm run check:drafts to list open placeholders.");
process.exit(failed ? 1 : 0);
