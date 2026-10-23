import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { expect, test } from "@playwright/test";
import { createToken } from "../../src/lib/auth/token";
import {
  COOKIE_SECRET,
  get,
  leaks,
  lockedSecrets,
  lockedSlugs,
  MAIN,
  PASSWORD_HASH,
  staticFiles,
  unlockCookie,
  variantHost,
  variants,
} from "./helpers";

/**
 * Proves that locked content never leaves the server without the password: not in HTML, not in
 * Markdown/agent responses, not in static files, images or showcase bundles.
 */
const secrets = lockedSecrets();
const { locked, withLockedSection } = lockedSlugs();
const gated = [...locked, ...withLockedSection];

test("the content has locked material to protect (sanity check)", () => {
  expect(locked.length).toBeGreaterThan(0);
  expect(secrets.filter((s) => s.source.includes("locked text")).length).toBeGreaterThan(5);
  expect(secrets.some((s) => s.source === "private image id")).toBe(true);
  expect(secrets.some((s) => s.source.startsWith("locked showcase"))).toBe(true);
});

test("no static file contains locked text, private image ids or locked showcase code", () => {
  const found: string[] = [];
  for (const file of staticFiles()) {
    const body = readFileSync(file, "latin1");
    for (const secret of leaks(body, secrets))
      found.push(`${relative(process.cwd(), file)}: ${secret.source} "${secret.value}"`);
  }
  expect(found).toEqual([]);
});

const agentRequests: Array<[string, Record<string, string>]> = [
  ["browser", {}],
  ["Accept: text/markdown", { accept: "text/markdown" }],
  [
    "AI crawler user agent",
    {
      "user-agent":
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    },
  ],
];

for (const slug of gated) {
  for (const [label, headers] of agentRequests) {
    test(`/work/${slug} leaks nothing without the password (${label})`, async () => {
      const res = await get(`/work/${slug}`, { headers });
      expect(res.status).toBeLessThan(500);
      expect(leaks(res.body, secrets)).toEqual([]);
      expect(res.headers["cache-control"]).toContain("no-store");
    });
  }
  test(`/work/${slug}.md leaks nothing without the password`, async () => {
    const res = await get(`/work/${slug}.md`);
    expect(leaks(res.body, secrets)).toEqual([]);
  });
}

for (const variant of variants()) {
  for (const slug of variant.projects.filter((p) => gated.includes(p))) {
    test(`variant ${variant.id}: /work/${slug} leaks nothing without the password`, async () => {
      for (const [, headers] of agentRequests) {
        const res = await get(`/work/${slug}`, { host: variantHost(variant.id), headers });
        expect(leaks(res.body, secrets)).toEqual([]);
      }
    });
  }
}

test("public entry points leak nothing", async () => {
  for (const path of ["/", "/about", "/llms.txt", "/index.md", "/sitemap.xml", "/robots.txt"]) {
    const res = await get(path);
    expect(leaks(res.body, secrets), path).toEqual([]);
  }
});

test("protected images and showcase bundles require the password", async () => {
  const imageId = secrets.find((s) => s.source === "private image id")?.value;
  const paths = [
    `/protected/img/${imageId}-480.webp`,
    `/protected/img/${imageId}-480.avif`,
    "/protected/showcases/care-roster/default.js",
  ];
  const expired = await createToken(COOKIE_SECRET, PASSWORD_HASH, Date.now() - 40 * 86_400_000);
  const valid = await createToken(COOKIE_SECRET, PASSWORD_HASH);
  const tampered = `${valid.slice(0, -4)}AAAA`;
  const forged = await createToken("not-the-real-secret-0123456789abcdef", PASSWORD_HASH);
  for (const path of paths) {
    for (const cookie of [
      "",
      `pf_unlock=${expired}`,
      `pf_unlock=${tampered}`,
      `pf_unlock=${forged}`,
    ]) {
      const res = await get(path, { headers: cookie ? { cookie } : {} });
      expect(res.status, `${path} with "${cookie}"`).toBe(401);
      expect(leaks(res.body, secrets)).toEqual([]);
    }
  }
});

test("a wrong password sets no cookie", async () => {
  const res = await get("/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: `http://${MAIN}` },
    body: "password=wrong&next=/work/care-scheduling",
  });
  expect(res.status).toBe(303);
  expect(res.headers.location).toContain("unlock=failed");
  expect(res.headers["set-cookie"]).toBeUndefined();
});

test("cross-site unlock attempts are rejected", async () => {
  const res = await get("/api/unlock", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://evil.example",
    },
    body: "password=e2e-password&next=/",
  });
  expect(res.status).toBe(403);
  expect(res.headers["set-cookie"]).toBeUndefined();
});

test("redirects after unlock stay on the site", async () => {
  const res = await get("/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: `http://${MAIN}` },
    body: "password=e2e-password&next=//evil.example/",
  });
  expect(res.headers.location).toBe("/");
});

test("with the password, locked content and assets are served", async () => {
  const cookie = await unlockCookie();
  expect(cookie).toMatch(/^pf_unlock=v1\./);
  for (const slug of locked) {
    const res = await get(`/work/${slug}`, { headers: { cookie } });
    expect(leaks(res.body, secrets).length, slug).toBeGreaterThan(0);
  }
  const imageId = secrets.find((s) => s.source === "private image id")?.value;
  const image = await get(`/protected/img/${imageId}-480.webp`, { headers: { cookie } });
  expect(image.status).toBe(200);
  expect(image.headers["content-type"]).toBe("image/webp");
  const bundle = await get("/protected/showcases/care-roster/default.js", { headers: { cookie } });
  expect(bundle.status).toBe(200);
});
