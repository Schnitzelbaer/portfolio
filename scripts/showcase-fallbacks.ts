/**
 * Captures the first frame of every public showcase variant as its static fallback image
 * (`showcases/<id>/fallback-<variant>.webp`). Needs the dev server: `npm run dev` first.
 * Usage: npm run showcases:fallbacks [-- base-url]
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:4321";
const ids = readdirSync("showcases", { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

const browser = await chromium.launch();
for (const id of ids) {
  const config = (await import(join(process.cwd(), "showcases", id, "showcase.config.ts")))
    .default as {
    variants: Array<{ name: string; size: [number, number] }>;
  };
  for (const variant of config.variants) {
    const [width, height] = variant.size;
    const scale = Math.min(2.5, Math.max(1, 1500 / width));
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(`${base}/showcase-preview/${id}?variant=${variant.name}`);
    await page.waitForSelector("body[data-ready]", { timeout: 20_000 });
    await page.waitForTimeout(500);
    const png = await page.locator("#stage").screenshot({ animations: "disabled" });
    const out = join("showcases", id, `fallback-${variant.name}.webp`);
    await sharp(png).webp({ quality: 82 }).toFile(out);
    console.log(out);
    await page.close();
  }
}
await browser.close();
