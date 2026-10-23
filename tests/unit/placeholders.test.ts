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

  it("ignores fenced code blocks and ordinary brackets", () => {
    const source = [
      "```md",
      "[Screen: example]",
      "```",
      "A [link](https://example.com) and [note].",
    ].join("\n");
    expect(findPlaceholders(source)).toEqual([]);
  });
});

describe("tokenizePlaceholders", () => {
  it("splits text around tokens", () => {
    expect(tokenizePlaceholders("Up [...] by [Screen: chart]!")).toEqual([
      { type: "text", value: "Up " },
      { type: "gap", value: "[...]" },
      { type: "text", value: " by " },
      { type: "screen", value: "chart" },
      { type: "text", value: "!" },
    ]);
  });
});
