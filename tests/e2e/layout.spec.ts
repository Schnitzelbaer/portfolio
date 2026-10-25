import { expect, test } from "@playwright/test";

test("reflection items with a bold lead-in flow as one paragraph", async ({ page }) => {
  await page.goto("/work/swissgeol-assets");
  const item = page.locator(".reflection li").first();
  const lead = item.locator("strong");
  const itemBox = await item.boundingBox();
  const leadBox = await lead.boundingBox();
  // The text after the lead-in uses the full column instead of the narrow number gutter.
  expect(itemBox && itemBox.height).toBeLessThan(200);
  expect(leadBox && itemBox && leadBox.x - itemBox.x).toBeGreaterThan(20);
});
