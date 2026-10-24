import { expect, test } from "@playwright/test";
import { lockedSlugs, PASSWORD } from "./helpers";

const { locked, withLockedSection } = lockedSlugs();

test("unlocking one case study unlocks all protected work", async ({ page }) => {
  const [first, second] = locked;
  await page.goto(`/work/${first}`);
  const form = page.locator("form#unlock");
  await expect(form).toBeVisible();
  await expect(page.locator(".case__body")).toHaveCount(0);

  await form.getByLabel("Password").fill("not the password");
  await form.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("alert")).toContainText("did not work");

  await page.locator("form#unlock").getByLabel("Password").fill(PASSWORD);
  await page.locator("form#unlock").getByRole("button", { name: "Unlock" }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${first}$`));
  await expect(page.locator(".case__body")).toBeVisible();

  // Protected images load for the unlocked visitor.
  const images = page.locator('.case__body img[src^="/protected/img/"]');
  await expect(images.first()).toBeVisible();
  await images.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      images.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);

  if (second) {
    await page.goto(`/work/${second}`);
    await expect(page.locator(".case__body")).toBeVisible();
    await expect(page.locator("form#unlock")).toHaveCount(0);
  }
  for (const slug of withLockedSection) {
    await page.goto(`/work/${slug}`);
    await expect(page.locator(".locked-open").first()).toBeVisible();
  }
});

test("a locked video loads only after unlocking", async ({ page }) => {
  await page.goto(`/work/${locked[0]}`);
  await expect(page.locator("[data-video-demo]")).toHaveCount(0);
  await page.locator("form#unlock").getByLabel("Password").fill(PASSWORD);
  await page.locator("form#unlock").getByRole("button", { name: "Unlock" }).click();
  const video = page.locator("[data-video-demo]").first();
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  const src = await video.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc);
  expect(src).toContain("/protected/media/");
});
