import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findPlaceholders } from "../../src/lib/content/placeholders";
import { convertNotionMarkdown, slugify } from "../../src/lib/notion/convert";

const fixture = readFileSync(
  new URL(
    "../fixtures/notion-export/Savings goals redesign 3f2a9c1e8b7d4e6fa1b2c3d4e5f60718.md",
    import.meta.url,
  ),
  "utf8",
);

describe("convertNotionMarkdown", () => {
  const result = convertNotionMarkdown(fixture, { author: "Simon Wirth" });

  it("maps Notion properties to frontmatter", () => {
    expect(result.frontmatter).toMatchObject({
      title: "Savings goals redesign",
      date: "2025-03-03",
      author: "Simon Wirth",
      locked: false,
      order: 6,
      cover: "./images/cover-image.png",
      keyFacts: { role: "Lead UX/UI Designer", status: "Launched 2025" },
    });
  });

  it("maps callouts and toggles to components", () => {
    expect(result.mdx).toContain('<Callout icon="💡">');
    expect(result.mdx).toContain('<Decision title="Automate the first step">');
    expect(result.mdx).toContain("<Locked>");
    expect(result.mdx).toContain('<Outcome type="achieved">');
    expect(result.mdx).toContain("<Reflection>");
    expect(result.mdx).toContain('<Toggle summary="Research details">');
  });

  it("copies and renames images", () => {
    expect(result.images.map((i) => i.target)).toEqual([
      "goal-overview.png",
      "segments.png",
      "cover-image.png",
    ]);
    expect(result.mdx).toContain("![Goal overview on mobile](./images/goal-overview.png)");
  });

  it("escapes MDX syntax in text but keeps placeholders readable", () => {
    expect(result.mdx).toContain("feature \\{and}");
    expect(result.mdx).toContain("[Screen: Goal setup with round-up suggestion]");
    const kinds = findPlaceholders(result.mdx).map((h) => h.kind);
    expect(kinds).toEqual(["gap", "screen", "gap", "gap"]);
  });

  it("warns about missing fields", () => {
    expect(result.warnings.join("\n")).toContain('Missing "coverAlt"');
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("Zürich Mobility: Café & Co.")).toBe("zurich-mobility-cafe-co");
  });
});
