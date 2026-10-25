import { expect, test } from "@playwright/test";

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
    .poll(async () => (await page.locator(".nav__tabs").boundingBox())?.y)
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

  test("the navigation sits at the bottom and there are no fades", async ({ page }) => {
    await page.goto("/work/ledger-onboarding");
    const bar = await page.locator(".nav__tabs").boundingBox();
    expect(bar && bar.y + bar.height).toBeGreaterThan(844 - 60);
    await expect(page.locator(".edge-blur").first()).toBeHidden();
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
  });
});
