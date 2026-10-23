import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { findPlaceholders, type PlaceholderHit } from "./placeholders";

export interface DraftFile {
  file: string;
  hits: PlaceholderHit[];
}

export interface DraftReport {
  /** Files with open placeholders that are part of at least one application variant. */
  blocking: Array<DraftFile & { variants: string[] }>;
  /** All other files with open placeholders. */
  warnings: DraftFile[];
}

function listVariants(root: string): Map<string, string[]> {
  const dir = join(root, "content", "variants");
  const map = new Map<string, string[]>();
  if (!existsSync(dir)) return map;
  for (const name of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const data = parseYaml(readFileSync(join(dir, name), "utf8")) as { projects?: unknown };
    const projects = Array.isArray(data?.projects) ? data.projects.map(String) : [];
    map.set(name.replace(/\.ya?ml$/, ""), projects);
  }
  return map;
}

function contentFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.mdx?$/.test(entry.name)) out.push(path);
    }
  };
  walk(join(root, "content"));
  return out.sort();
}

/**
 * Scans all content for open placeholders.
 * Pass `onlyVariant` to treat just that variant's case studies as blocking.
 */
export function collectDraftReport(root: string, onlyVariant?: string): DraftReport {
  const variants = listVariants(root);
  if (onlyVariant && !variants.has(onlyVariant)) {
    throw new Error(
      `Unknown variant "${onlyVariant}". Expected a file content/variants/${onlyVariant}.yaml`,
    );
  }
  const report: DraftReport = { blocking: [], warnings: [] };
  for (const path of contentFiles(root)) {
    const hits = findPlaceholders(readFileSync(path, "utf8"));
    if (!hits.length) continue;
    const file = relative(root, path);
    const slug = /content[\\/]work[\\/]([^\\/]+)[\\/]/.exec(file)?.[1];
    const usedBy = [...variants]
      .filter(
        ([id, projects]) => (!onlyVariant || id === onlyVariant) && slug && projects.includes(slug),
      )
      .map(([id]) => id);
    if (usedBy.length) report.blocking.push({ file, hits, variants: usedBy });
    else report.warnings.push({ file, hits });
  }
  return report;
}

export function formatDraftFile(entry: DraftFile): string {
  const lines = entry.hits.map((hit) => {
    const label = hit.kind === "screen" ? `[Screen: ${hit.text}]` : hit.text;
    return `    ${entry.file}:${hit.line}:${hit.column}  ${label}`;
  });
  return lines.join("\n");
}
