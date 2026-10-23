import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1] ?? "", m[2] ?? ""]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const TEXT = ["text", "text-strong", "text-body", "text-muted", "text-subtle", "accent-ink"];
const BACKGROUNDS = ["bg", "bg-elevated", "surface"];

describe.each([
  ["dark", ":root"],
  ["light", ':root[data-theme="light"]'],
])("%s theme", (_, selector) => {
  const tokens = { ...block(":root"), ...block(selector) };
  for (const text of TEXT) {
    for (const bg of BACKGROUNDS) {
      it(`--${text} on --${bg} meets WCAG AA (4.5:1)`, () => {
        expect(contrast(tokens[text] ?? "", tokens[bg] ?? "")).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  it("--accent-ink on --accent-surface meets AA", () => {
    expect(
      contrast(tokens["accent-ink"] ?? "", tokens["accent-surface"] ?? ""),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
