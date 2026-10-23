import { expect, test } from "@playwright/test";
import { get, PORT, variantHost, variants } from "./helpers";

const variant = variants()[0];

test.describe("application variants", () => {
  test.skip(!variant, "no variant configured");
  const id = variant?.id ?? "";
  const url = (path: string) => `http://${variantHost(id)}${path}`;

  test("shows the variant's selection in its order, with the personal intro", async ({ page }) => {
    await page.goto(url("/"));
    const titles = page.locator(".card__title");
    await expect(titles).toHaveCount(variant?.projects.length ?? 0);
    const hrefs = await page
      .locator(".card__link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(variant?.projects.map((p) => `/work/${p}`));
    if (variant?.intro)
      await expect(page.locator(".work__greeting")).toContainText(variant.intro.slice(0, 20));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("is not indexed and has no sitemap entry", async () => {
    const res = await get("/", { host: variantHost(id) });
    expect(res.headers["x-robots-tag"]).toContain("noindex");
    const sitemap = await get("/sitemap.xml");
    expect(sitemap.body).not.toContain(`${id}.`);
    expect(sitemap.body).not.toContain("/v/");
  });

  test("hides case studies that are not part of the variant", async () => {
    const all = [
      "ledger-onboarding",
      "transit-planner",
      "care-scheduling",
      "energy-dashboard",
      "design-system",
    ];
    for (const slug of all.filter((s) => !variant?.projects.includes(s))) {
      const res = await get(`/work/${slug}`, { host: variantHost(id) });
      expect(res.status, slug).toBe(404);
    }
  });

  test("is never linked from the main site, and /v/ is not reachable there", async ({ page }) => {
    for (const path of ["/", "/about", "/work/ledger-onboarding"]) {
      await page.goto(`http://portfolio.localhost:${PORT}${path}`);
      const links = await page
        .locator("a[href]")
        .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
      expect(links.filter((href) => href.includes(`${id}.`) || href.includes("/v/"))).toEqual([]);
    }
    expect((await get(`/v/${id}`)).status).toBe(404);
    expect((await get(`/v/${id}/about`)).status).toBe(404);
  });

  test("unknown subdomains redirect to the main domain", async () => {
    const res = await get("/about", { host: `nobody.portfolio.localhost:${PORT}` });
    expect([307, 308]).toContain(res.status);
    expect(res.headers.location).toBe("https://portfolio.localhost/");
  });
});
