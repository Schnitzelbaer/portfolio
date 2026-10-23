import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOCK_NAMES } from "../../src/components/blocks/names";
import {
  caseStudyMarkdown,
  type MarkdownContext,
  mdxToMarkdown,
  SERIALIZED_BLOCKS,
} from "../../src/lib/agent/markdown";

const ctx = (unlocked = false): MarkdownContext => ({
  unlocked,
  describeShowcase: (id) =>
    id === "care-roster"
      ? { title: "Roster", description: "Locked tour.", locked: true }
      : { title: "Onboarding", description: "A tour of the flow.", locked: false },
});

describe("Markdown serializers", () => {
  it("cover every block", () => {
    expect([...SERIALIZED_BLOCKS].sort()).toEqual([...BLOCK_NAMES].sort());
  });

  it("render the flagship case study without JSX and without locked content", () => {
    const source = readFileSync("content/work/ledger-onboarding/index.mdx", "utf8");
    const md = mdxToMarkdown(source, ctx());
    expect(md).not.toMatch(/<[A-Z][A-Za-z]*[\s/>]/);
    expect(md).toContain("**Decision: Show the whole path up front**");
    expect(md).toContain("**Before and after:**");
    expect(md).toContain("**Achieved outcome**");
    expect(md).toContain("Interactive tour: Onboarding.");
    expect(md).toContain("🔒 Risk scoring and fraud review");
    expect(md).not.toContain("fraud team uses");
    expect(md).not.toContain("risk-model");
  });

  it("includes locked sections only when unlocked", () => {
    const source = '<Locked title="Secret">\n  The hidden part.\n</Locked>';
    expect(mdxToMarkdown(source, ctx(false))).not.toContain("hidden part");
    expect(mdxToMarkdown(source, ctx(true))).toContain("The hidden part.");
  });

  it("describes placeholders and protected showcases", () => {
    const md = mdxToMarkdown(
      'Up by [...].\n\n[Screen: Login]\n\n<Showcase id="care-roster" />',
      ctx(),
    );
    expect(md).toContain("Up by […].");
    expect(md).toContain("[Image placeholder: Login]");
    expect(md).toContain("password protected");
    expect(md).not.toContain("Locked tour.");
  });

  it("describes local Markdown images instead of exposing their paths", () => {
    const md = mdxToMarkdown('![Planner](./images/planner.jpg "Live departures.")', ctx());
    expect(md).toBe("[Image: Planner] _Live departures._");
  });

  it("fails loudly for unknown components", () => {
    expect(() => mdxToMarkdown("<Mystery />", ctx())).toThrow(
      /No Markdown serializer for <Mystery>/,
    );
  });

  it("never includes the body of a locked case study without the password", () => {
    const meta = {
      title: "T",
      lead: "L",
      outcome: "O",
      date: new Date("2024-01-01"),
      locked: true,
      keyFacts: { role: "R", client: "C", team: "Te", status: "S" },
    };
    const md = caseStudyMarkdown(meta, "Top secret body text.", {
      url: "https://x/work/t",
      ctx: ctx(),
    });
    expect(md).toContain("# T");
    expect(md).toContain("password protected");
    expect(md).not.toContain("Top secret");
  });
});
