import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectDraftReport } from "../../src/lib/content/drafts";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "drafts-"));
  const write = (path: string, text: string) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write("content/work/alpha/index.mdx", "Done.");
  write("content/work/beta/index.mdx", "Up by [...].");
  write("content/work/gamma/index.mdx", "[Screen: Home]");
  write("content/variants/acme.yaml", "company: Acme\nprojects:\n  - alpha\n  - beta\n");
  return root;
}

describe("collectDraftReport", () => {
  it("blocks placeholders in variant case studies and warns about the rest", () => {
    const report = collectDraftReport(fixture());
    expect(report.blocking.map((b) => [b.file, b.variants])).toEqual([
      ["content/work/beta/index.mdx", ["acme"]],
    ]);
    expect(report.warnings.map((w) => w.file)).toEqual(["content/work/gamma/index.mdx"]);
  });

  it("rejects unknown variants", () => {
    expect(() => collectDraftReport(fixture(), "nope")).toThrow(/Unknown variant/);
  });
});
