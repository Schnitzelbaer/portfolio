/**
 * Builds everything that may only be served behind the password gate into `private/`:
 * - responsive AVIF/WebP versions of images in locked entries and <Locked> sections,
 * - copies of videos in locked entries and <Locked> sections (`private/media/`),
 * - `private/manifest.json`.
 * Runs before `astro build` and `astro dev`. The folder is gitignored and never static.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import sharp from "sharp";
import { unified } from "unified";
import { VFile } from "vfile";
import { parse as parseYaml } from "yaml";
import { remarkBlockImages } from "../src/lib/content/remark-block-images";
import { IMAGE_FORMATS, PRIVATE_DIR, type PrivateManifest } from "../src/lib/private-assets";

const root = process.cwd();
const out = join(root, PRIVATE_DIR);
const WIDTHS = [480, 800, 1200, 1600];

function contentFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? contentFiles(path) : /\.mdx$/.test(entry.name) ? [path] : [];
  });
}

function collectPrivateAssets() {
  const images = new Map<string, string>();
  const media = new Map<string, string>();
  for (const filePath of contentFiles(join(root, "content"))) {
    const text = readFileSync(filePath, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text);
    const file = new VFile({ path: filePath, value: text });
    file.data = { astro: { frontmatter: fm ? (parseYaml(fm[1] ?? "") ?? {}) : {} } };
    const processor = unified()
      .use(remarkParse)
      .use(remarkMdx)
      .use(remarkFrontmatter)
      .use(remarkGfm)
      .use(remarkBlockImages, {
        onPrivateImage: ({ id, src }) => images.set(id, resolve(dirname(filePath), src)),
        onPrivateMedia: ({ file: name, src }) => media.set(name, resolve(dirname(filePath), src)),
      });
    processor.runSync(processor.parse(file), file);
  }
  return { images: [...images].map(([id, source]) => ({ id, source })), media: [...media] };
}

async function buildImages(
  manifest: PrivateManifest,
  assets: ReturnType<typeof collectPrivateAssets>,
) {
  const dir = join(out, "img");
  mkdirSync(dir, { recursive: true });
  for (const { id, source } of assets.images) {
    if (!existsSync(source)) throw new Error(`Private image not found: ${source}`);
    const meta = await sharp(source).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const widths = WIDTHS.filter((w) => w < width).concat(Math.min(width, 2000));
    const unique = [...new Set(widths)].sort((a, b) => a - b);
    manifest.images[id] = { width, height, widths: unique };
    for (const w of unique) {
      for (const format of IMAGE_FORMATS) {
        const target = join(dir, `${id}-${w}.${format}`);
        if (existsSync(target) && statSync(target).mtimeMs > statSync(source).mtimeMs) continue;
        await sharp(source)
          .resize({ width: w })
          [format]({ quality: format === "avif" ? 55 : 78 })
          .toFile(target);
      }
    }
  }
}

function copyMedia(manifest: PrivateManifest, assets: ReturnType<typeof collectPrivateAssets>) {
  const dir = join(out, "media");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, source] of assets.media) {
    if (!existsSync(source)) throw new Error(`Private video not found: ${source}`);
    copyFileSync(source, join(dir, name));
    manifest.media[name] = { size: statSync(source).size };
  }
}

const manifest: PrivateManifest = { images: {}, media: {} };
const assets = collectPrivateAssets();
// Output of the former showcase bundles; removed so it never lands in the function again.
rmSync(join(out, "showcases"), { recursive: true, force: true });
await buildImages(manifest, assets);
copyMedia(manifest, assets);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[private] ${Object.keys(manifest.images).length} images, ${Object.keys(manifest.media).length} videos → ${PRIVATE_DIR}/`,
);
