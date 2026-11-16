import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every video on the site carries a short visible description. */
const WORK = "content/work";
const slugs = readdirSync(WORK).filter((slug) => existsSync(join(WORK, slug, "index.mdx")));

describe("video captions", () => {
  for (const slug of slugs) {
    const source = readFileSync(join(WORK, slug, "index.mdx"), "utf8");

    it(`${slug}: every <Video> has a caption`, () => {
      const missing = [...source.matchAll(/<Video\b[\s\S]*?\/>/g)]
        .map(([tag]) => tag)
        .filter((tag) => !/\bcaption="[^"]+"/.test(tag))
        .map((tag) => /\bsrc="([^"]+)"/.exec(tag)?.[1] ?? tag.slice(0, 60));
      expect(missing).toEqual([]);
    });

    if (existsSync(join(WORK, slug, "cover.mp4")) || existsSync(join(WORK, slug, "cover.webm"))) {
      it(`${slug}: the cover video has a coverCaption`, () => {
        expect(source).toMatch(/^coverCaption: \S.*$/m);
      });
    }
  }
});
