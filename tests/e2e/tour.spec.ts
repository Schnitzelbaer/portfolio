import { expect, test } from "@playwright/test";

test("a showcase tour plays when visible and can be paused", async ({ page }) => {
  await page.goto("/work/ledger-onboarding");
  const showcase = page.locator('[data-showcase-id="banking-onboarding"]');
  await showcase.scrollIntoViewIfNeeded();
  await expect(showcase).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  const progress = showcase.locator("[data-progress]");
  await expect
    .poll(async () => progress.evaluate((el) => (el as HTMLElement).style.transform))
    .not.toBe("scaleX(0)");
  await showcase.getByRole("button", { name: "Pause tour" }).click();
  await expect(showcase).toHaveAttribute("data-playing", "false");
  const frozen = await progress.evaluate((el) => (el as HTMLElement).style.transform);
  await page.waitForTimeout(800);
  expect(await progress.evaluate((el) => (el as HTMLElement).style.transform)).toBe(frozen);
});

test("with reduced motion nothing autoplays and the static frame stays", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/work/ledger-onboarding");
  const showcase = page.locator('[data-showcase-id="banking-onboarding"]');
  await showcase.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(showcase).toHaveAttribute("data-state", "idle");
  await expect(showcase.locator(".showcase__fallback img")).toBeVisible();
  await showcase.getByRole("button", { name: "Play tour", exact: true }).click();
  await expect(showcase).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  await context.close();
});
