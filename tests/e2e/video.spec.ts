import { expect, type Page, test } from "@playwright/test";

/** Video demos on a public case study (the flagship has a desktop and a mobile variant). */
const PAGE = "/work/ledger-onboarding";

const demo = (page: Page) => page.locator("[data-video-demo]").last();
/** Sources attached to the video element (nothing is attached before it nears the viewport). */
const videoSources = (page: Page) =>
  demo(page)
    .locator("video source")
    .evaluateAll((sources) => sources.map((s) => (s as HTMLSourceElement).src));

test("autoplays muted, looping and inline when visible, without native controls", async ({
  page,
}) => {
  await page.goto(PAGE);
  const root = demo(page);
  expect(await videoSources(page)).toEqual([]);

  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  const video = root.locator("video");
  const props = await video.evaluate((v: HTMLVideoElement) => ({
    muted: v.muted,
    loop: v.loop,
    playsInline: v.playsInline,
    controls: v.controls,
    src: v.currentSrc,
  }));
  expect(props).toMatchObject({ muted: true, loop: true, playsInline: true, controls: false });
  expect(props.src).toMatch(/onboarding-tour\.[^/]*\.(webm|mp4)$/);
  await expect(root.getByRole("button", { name: "Pause video" })).toBeAttached();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(root).toHaveAttribute("data-playing", "false");
});

test("the button appears on hover and toggles playback", async ({ page }) => {
  await page.goto(PAGE);
  const root = demo(page);
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  const button = root.locator("[data-video-toggle]");
  await expect(button).toHaveCSS("opacity", "0");
  await root.locator("video").hover();
  await expect(button).toHaveCSS("opacity", "1");
  await button.click();
  await expect(root).toHaveAttribute("data-playing", "false");
  await expect(button).toHaveAttribute("aria-label", "Play video");
  await button.click();
  await expect(root).toHaveAttribute("data-playing", "true");
  await expect(button).toHaveAttribute("aria-label", "Pause video");
});

test("keyboard focus reveals the button", async ({ page }) => {
  await page.goto(PAGE);
  const button = demo(page).locator("[data-video-toggle]");
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await button.evaluate((b) => b === document.activeElement)) break;
  }
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("opacity", "1");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("loads only the mobile file; a tap shows the button, a tap on it pauses", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const root = demo(page);
    await root.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
    const sources = await videoSources(page);
    expect(sources.length).toBe(2);
    expect(sources.every((src) => src.includes("onboarding-tour-mobile"))).toBe(true);
    expect(await root.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain(
      "onboarding-tour-mobile",
    );

    const button = root.locator("[data-video-toggle]");
    await expect(button).toHaveCSS("opacity", "0");
    await root.locator("video").tap();
    await expect(button).toHaveCSS("opacity", "1");
    await button.tap();
    await expect(root).toHaveAttribute("data-playing", "false");
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing starts on its own; the poster stays and the button starts the video", async ({
    page,
  }) => {
    await page.goto(PAGE);
    const root = demo(page);
    await root.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await expect(root).toHaveAttribute("data-playing", "false");
    expect(await videoSources(page)).toEqual([]);
    await expect(root.locator(".video-demo__poster img")).toBeVisible();
    const button = root.getByRole("button", { name: "Play video" });
    await expect(button).toHaveCSS("opacity", "1");
    await button.click();
    await expect(root).toHaveAttribute("data-playing", "true", { timeout: 10_000 });
  });
});
