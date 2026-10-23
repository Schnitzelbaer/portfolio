/**
 * Captures checkpoint screenshots: every page at desktop and mobile width, dark and light.
 * Usage: npm run screenshots -- [base-url] (default http://localhost:4321). Output: screenshots/
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4321";
const pages = (
  process.env.SCREENSHOT_PAGES ??
  "/,/about,/work/ledger-onboarding,/work/care-scheduling,/work/design-system"
).split(",");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const themes = ["dark", "light"] as const;

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
for (const theme of themes) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.name === "mobile" ? 2 : 1,
      colorScheme: theme,
    });
    await context.addInitScript((t) => {
      try {
        localStorage.setItem("theme", t);
      } catch {}
    }, theme);
    const page = await context.newPage();
    for (const path of pages) {
      await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
      // Scroll through the page so lazy images load before the full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForFunction(() => [...document.images].every((img) => img.complete), null, {
        timeout: 30_000,
      });
      await page.evaluate(() =>
        Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))),
      );
      const url = new URL(path, base);
      const prefix = url.hostname.split(".").length > 2 ? `${url.hostname.split(".")[0]}-` : "";
      const slug = url.pathname === "/" ? "work" : url.pathname.slice(1).replaceAll("/", "-");
      const name = `${prefix}${slug}--${viewport.name}--${theme}.png`;
      await page.screenshot({
        path: `screenshots/${name}`,
        fullPage: true,
        animations: "disabled",
      });
      console.log(`screenshots/${name}`);
    }
    await context.close();
  }
}
await browser.close();
