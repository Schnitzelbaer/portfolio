/**
 * Placeholder convention used while writing case studies in Notion:
 * - `[Screen: description]` marks a missing image and renders as an image placeholder.
 * - Any other bracketed note marks an open spot: `[...]`, a provisional value like `[1890]`, or
 *   a reminder like `[Add the number of processed files]`. Links (`[text](url)`), references
 *   (`[text][id]`), images and task list boxes are not placeholders.
 */
export type PlaceholderKind = "screen" | "gap";

export interface PlaceholderHit {
  kind: PlaceholderKind;
  /** Description for `screen`, the bracketed note for `gap` (e.g. `[1890]`). */
  text: string;
  line: number;
  column: number;
}

export const SCREEN_PATTERN = /\[Screen:\s*([^\]]*?)\s*\]/g;
/** Bracketed note that is not a screen, link, reference, definition, image or task box. */
export const GAP_PATTERN = /(?<![!\\\]])\[(?!Screen:)(?![ xX]\])([^[\]\n]+)\](?![([:])/g;
/** The strict form used in frontmatter, where YAML may use brackets for lists. */
const FRONTMATTER_GAP = /\[(?:\.\.\.|…)\]/g;

/** True when a gap note carries no hint (`[...]` or `[…]`). */
export function isEmptyGap(note: string): boolean {
  return /^(?:\.\.\.|…)$/.test(note.trim());
}

/** Splits text into literal parts and placeholder tokens, in order. Gap values are the inner note. */
export function tokenizePlaceholders(
  text: string,
): Array<{ type: "text"; value: string } | { type: PlaceholderKind; value: string }> {
  const combined = new RegExp(`${SCREEN_PATTERN.source}|${GAP_PATTERN.source}`, "g");
  const out: Array<{ type: "text"; value: string } | { type: PlaceholderKind; value: string }> = [];
  let last = 0;
  for (const match of text.matchAll(combined)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", value: text.slice(last, index) });
    if (match[1] !== undefined) out.push({ type: "screen", value: match[1] });
    else out.push({ type: "gap", value: (match[2] ?? "").trim() });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/**
 * Finds placeholders in raw Markdown/MDX source with line numbers.
 * Frontmatter only counts `[...]` (the Notion import writes `"[...]"` for missing fields);
 * fenced code blocks are skipped so documentation examples do not count.
 */
export function findPlaceholders(source: string): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  const lines = source.split(/\r?\n/);
  let inFence = false;
  let inFrontmatter = lines[0]?.trim() === "---";
  lines.forEach((line, i) => {
    if (inFrontmatter) {
      if (i > 0 && line.trim() === "---") inFrontmatter = false;
      for (const match of line.matchAll(FRONTMATTER_GAP)) {
        hits.push({ kind: "gap", text: match[0], line: i + 1, column: (match.index ?? 0) + 1 });
      }
      return;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const code = line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
    for (const match of code.matchAll(SCREEN_PATTERN)) {
      hits.push({
        kind: "screen",
        text: match[1] ?? "",
        line: i + 1,
        column: (match.index ?? 0) + 1,
      });
    }
    for (const match of code.matchAll(GAP_PATTERN)) {
      hits.push({ kind: "gap", text: match[0], line: i + 1, column: (match.index ?? 0) + 1 });
    }
  });
  return hits.sort((a, b) => a.line - b.line || a.column - b.column);
}
