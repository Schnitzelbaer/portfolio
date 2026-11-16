import { expect, test } from "@playwright/test";
import { ABOUT, get } from "./helpers";

test("reflection items with a bold lead-in flow as one paragraph", async ({ page }) => {
  await page.goto("/work/swissgeol-assets");
  const item = page.locator(".reflection li").first();
  const lead = item.locator("strong");
  const itemBox = await item.boundingBox();
  const leadBox = await lead.boundingBox();
  // The text after the lead-in uses the full column instead of the narrow number gutter.
  expect(itemBox?.height).toBeLessThan(200);
  expect(leadBox && itemBox && leadBox.x - itemBox.x).toBeGreaterThan(20);
});

test("the navigation stays at the top while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/ledger-onboarding");
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(async () => (await page.locator("[data-nav-back]").boundingBox())?.y)
    .toBeLessThan(30);
});

test("project pages have a back button, the list does not", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-nav-back]")).toHaveCount(0);
  await page.locator(".work a[href='/work/ledger-onboarding']").first().click();
  const back = page.getByRole("link", { name: "Back to work" });
  await expect(back).toHaveAttribute("href", "/");
  await back.click();
  await expect(page).toHaveURL(/\/$/);
});

test("the end of a page stays clear of the bottom fade", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work/ledger-onboarding");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const fade = await page.locator(".edge-blur--bottom").boundingBox();
  const last = await page.locator("main").evaluate((main) => {
    const rects = [...main.querySelectorAll("*")].map((el) => el.getBoundingClientRect().bottom);
    return Math.max(...rects);
  });
  expect(fade && last).toBeLessThanOrEqual(fade?.y ?? 0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the navigation stays at the top and there are no fades", async ({ page }) => {
    await page.goto("/work/ledger-onboarding");
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect
      .poll(async () => (await page.locator("[data-nav-back]").boundingBox())?.y)
      .toBeLessThan(30);
    await expect(page.locator(".edge-blur").first()).toBeHidden();
  });
});

test.describe("with the About page switched off", () => {
  test.skip(ABOUT, "pages.about is on in content/site.yaml");

  test("there is no About page, no menu and no About link", async ({ page }) => {
    expect((await get("/about")).status).toBe(404);
    expect((await get("/about.md")).status).toBe(404);
    expect((await get("/sitemap.xml")).body).not.toContain("/about");
    expect((await get("/llms.txt")).body).not.toContain("/about");
    await page.goto("/");
    await expect(page.locator(".nav__tabs")).toHaveCount(0);
    await expect(page.locator('a[href="/about"]')).toHaveCount(0);
  });

  test("case studies have a labelled Back button at the top left", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/work/swissgeol-assets");
    const back = page.getByRole("link", { name: "Back to work" });
    await expect(back).toHaveText("Back");
    const box = await back.boundingBox();
    expect(box?.x).toBeLessThan(40);
  });
});
