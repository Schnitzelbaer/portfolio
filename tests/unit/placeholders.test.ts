import { describe, expect, it } from "vitest";
import { findPlaceholders, tokenizePlaceholders } from "../../src/lib/content/placeholders";

describe("findPlaceholders", () => {
  it("finds screens and gaps with positions, including frontmatter", () => {
    const source = [
      "---",
      'coverAlt: "[...]"',
      "---",
      "Text [Screen: Login form] and [...] and […].",
    ].join("\n");
    expect(findPlaceholders(source)).toEqual([
      { kind: "gap", text: "[...]", line: 2, column: 12 },
      { kind: "screen", text: "Login form", line: 4, column: 6 },
      { kind: "gap", text: "[...]", line: 4, column: 31 },
      { kind: "gap", text: "[…]", line: 4, column: 41 },
    ]);
  });

  it("ignores code, links, references, images and task boxes", () => {
    const source = [
      "```md",
      "[Screen: example]",
      "```",
      "A [link](https://example.com), a [ref][1], ![img](./a.png), `[code]`.",
      "- [ ] task",
      "[1]: https://example.com",
    ].join("\n");
    expect(findPlaceholders(source)).toEqual([]);
  });

  it("treats bracketed notes as open spots", () => {
    const hits = findPlaceholders("Since [1890], about [100'000+] files. [Add your learning]");
    expect(hits.map((h) => h.text)).toEqual(["[1890]", "[100'000+]", "[Add your learning]"]);
  });
});

describe("tokenizePlaceholders", () => {
  it("splits text around tokens", () => {
    expect(tokenizePlaceholders("Up [...] by [Screen: chart]!")).toEqual([
      { type: "text", value: "Up " },
      { type: "gap", value: "..." },
      { type: "text", value: " by " },
      { type: "screen", value: "chart" },
      { type: "text", value: "!" },
    ]);
  });
});
