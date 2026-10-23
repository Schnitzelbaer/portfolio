/**
 * Placeholder convention used while writing case studies in Notion:
 * - `[Screen: description]` marks a missing image and renders as an image placeholder.
 * - `[...]` (or `[…]`) marks an open spot such as a number or a learning.
 */
export type PlaceholderKind = "screen" | "gap";

export interface PlaceholderHit {
  kind: PlaceholderKind;
  /** Description for `screen`, the literal token for `gap`. */
  text: string;
  line: number;
  column: number;
}

export const SCREEN_PATTERN = /\[Screen:\s*([^\]]*?)\s*\]/g;
export const GAP_PATTERN = /\[(?:\.\.\.|…)\]/g;

/** Splits text into literal parts and placeholder tokens, in order. */
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
    else out.push({ type: "gap", value: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/**
 * Finds placeholders in raw Markdown/MDX source with line numbers.
 * Includes frontmatter (the Notion import writes `"[...]"` for missing fields) and skips fenced
 * code blocks so documentation examples do not count.
 */
export function findPlaceholders(source: string): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  const lines = source.split(/\r?\n/);
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    for (const match of line.matchAll(SCREEN_PATTERN)) {
      hits.push({
        kind: "screen",
        text: match[1] ?? "",
        line: i + 1,
        column: (match.index ?? 0) + 1,
      });
    }
    for (const match of line.matchAll(GAP_PATTERN)) {
      hits.push({ kind: "gap", text: match[0], line: i + 1, column: (match.index ?? 0) + 1 });
    }
  });
  return hits.sort((a, b) => a.line - b.line || a.column - b.column);
}
