import type { Root } from "mdast";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { VFile } from "vfile";
import { describe, expect, it } from "vitest";
import { privateImageId } from "../../src/lib/content/private-images";
import { remarkBlockImages } from "../../src/lib/content/remark-block-images";
import { remarkPlaceholders } from "../../src/lib/content/remark-placeholders";

function run(source: string, frontmatter: Record<string, unknown> = {}) {
  const file = new VFile({ path: "/repo/content/work/demo/index.mdx", value: source });
  file.data = { astro: { frontmatter } };
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkPlaceholders)
    .use(remarkBlockImages);
  const tree = processor.runSync(processor.parse(file), file) as Root;
  return unified().use(remarkMdx).use(remarkStringify).stringify(tree);
}

describe("remarkPlaceholders", () => {
  it("turns a screen-only paragraph into a block placeholder", () => {
    expect(run("[Screen: Login form]")).toContain('<Placeholder label="Login form" />');
  });

  it("turns inline tokens into components", () => {
    const out = run("Grew by [...] after [Screen: chart] launch.");
    expect(out).toContain('<Gap note="..." />');
    expect(out).toContain('<Placeholder label="chart" inline={true} />');
  });
});

describe("remarkBlockImages", () => {
  it("imports images in public content", () => {
    const out = run('<Figure src="./images/a.jpg" alt="A" />\n\n![B](./images/b.jpg "Caption B")');
    expect(out).toContain('import __blockAsset0 from "./images/a.jpg"');
    expect(out).toContain('import __blockAsset1 from "./images/b.jpg"');
    expect(out).toContain("src={__blockAsset0}");
    expect(out).toContain('<Figure src={__blockAsset1} alt="B" caption="Caption B" />');
  });

  it("never imports images inside <Locked>", () => {
    const out = run(
      '<Locked>\n  ![Secret](./images/secret.jpg)\n\n  <Figure src="./images/s2.jpg" alt="S2" />\n</Locked>',
    );
    expect(out).not.toContain("import ");
    expect(out).not.toContain("secret.jpg");
    expect(out).toContain(`privateId="${privateImageId("demo", "./images/secret.jpg")}"`);
    expect(out).toContain(`privateId="${privateImageId("demo", "./images/s2.jpg")}"`);
  });

  it("never imports images of a locked entry", () => {
    const out = run('<Compare>\n  <Variant label="A" src="./images/a.jpg" alt="A" />\n</Compare>', {
      locked: true,
    });
    expect(out).not.toContain("import ");
    expect(out).toContain("privateId=");
  });

  it("imports public videos and their posters", () => {
    const out = run(
      '<Video src="./videos/a.mp4" webm="./videos/a.webm" poster="./videos/a.jpg" alt="A" />',
    );
    expect(out).toContain('import __blockAsset0 from "./videos/a.mp4"');
    expect(out).toContain("webm={__blockAsset1}");
    expect(out).toContain("poster={__blockAsset2}");
  });

  it("never imports videos in locked context", () => {
    const out = run(
      '<Locked>\n  <Video src="./videos/s.mp4" mobileWebm="./videos/s-m.webm" poster="./videos/s.jpg" alt="S" />\n</Locked>',
    );
    expect(out).not.toContain("import ");
    expect(out).toMatch(/src="\/protected\/media\/demo--s-[0-9a-f]{10}\.mp4"/);
    expect(out).toMatch(/mobileWebm="\/protected\/media\/demo--s-m-[0-9a-f]{10}\.webm"/);
    expect(out).toContain(`posterPrivateId="${privateImageId("demo", "./videos/s.jpg")}"`);
  });

  it("leaves remote images alone", () => {
    expect(run("![R](https://example.com/r.png)")).toContain("![R](https://example.com/r.png)");
  });
});
