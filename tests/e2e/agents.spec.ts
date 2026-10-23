import { expect, test } from "@playwright/test";
import { get, lockedSlugs, unlockCookie, variantHost, variants } from "./helpers";

const { locked } = lockedSlugs();

test("pages answer Accept: text/markdown with Markdown", async () => {
  for (const path of ["/", "/about", "/work/transit-planner", `/work/${locked[0]}`]) {
    const res = await get(path, { headers: { accept: "text/markdown" } });
    expect(res.status, path).toBe(200);
    expect(res.headers["content-type"], path).toContain("text/markdown");
    expect(res.body.startsWith("# "), path).toBe(true);
  }
});

test("known AI crawlers get Markdown by default, browsers get HTML", async () => {
  const bot = await get("/about", {
    headers: { "user-agent": "Mozilla/5.0 (compatible; ClaudeBot/1.0)" },
  });
  expect(bot.headers["content-type"]).toContain("text/markdown");
  const browser = await get("/about", { headers: { "user-agent": "Mozilla/5.0 Chrome/150" } });
  expect(browser.headers["content-type"]).toContain("text/html");
  expect(String(browser.headers.vary)).toContain("Accept");
});

test("every page links its Markdown version and llms.txt", async ({ page }) => {
  await page.goto("/work/transit-planner");
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    "href",
    "/work/transit-planner.md",
  );
  const llms = await get("/llms.txt");
  expect(llms.body).toContain("/work/transit-planner.md");
  for (const slug of locked)
    expect(llms.body).toMatch(new RegExp(`${slug}\\.md\\): .*Password protected`));
});

test("locked case studies stay locked as Markdown, until unlocked", async () => {
  const slug = locked[0] ?? "";
  const anonymous = await get(`/work/${slug}.md`);
  expect(anonymous.body).toContain("password protected");
  const cookie = await unlockCookie();
  const unlocked = await get(`/work/${slug}.md`, { headers: { cookie } });
  expect(unlocked.body).not.toContain("This case study is password protected");
  expect(unlocked.body.length).toBeGreaterThan(anonymous.body.length + 200);
});

test("variants have their own Markdown and llms.txt", async () => {
  const variant = variants()[0];
  test.skip(!variant, "no variant configured");
  const host = variantHost(variant?.id ?? "");
  const index = await get("/", { host, headers: { accept: "text/markdown" } });
  expect(index.headers["content-type"]).toContain("text/markdown");
  for (const slug of variant?.projects ?? []) expect(index.body).toContain(`/work/${slug}.md`);
  const llms = await get("/llms.txt", { host });
  expect(llms.body).toContain(`Prepared for ${variant?.company ?? ""}`);
});

test("the For agents switch toggles between the regular and the agent version", async ({
  page,
}) => {
  await page.goto("/work/transit-planner");
  await page.getByRole("link", { name: "For agents: agent-friendly version of this page" }).click();
  await expect(page).toHaveURL(/\/agent\/work\/transit-planner$/);
  await expect(page.locator(".agent__doc")).toContainText("# A journey planner");
  await page.getByRole("link", { name: "For agents: on. Back to the regular version" }).click();
  await expect(page).toHaveURL(/\/work\/transit-planner$/);
});
