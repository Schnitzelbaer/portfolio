/**
 * Checks a deployment (e.g. a Vercel preview or production) for the things only Vercel can
 * prove: routing rules, content negotiation, the gate. Also warms the CDN cache for images on
 * on-demand pages.
 *
 * Usage: npm run smoke -- https://example.ch [--variant https://acme.example.ch] [--production]
 */
import { parseArgs } from "node:util";
import { loadVariantsFromDisk } from "../src/lib/variants/disk";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { variant: { type: "string" }, production: { type: "boolean", default: false } },
});
const base = positionals[0]?.replace(/\/$/, "");
if (!base) {
  console.error("Usage: npm run smoke -- <base-url> [--variant <variant-url>] [--production]");
  process.exit(1);
}

let failures = 0;
async function check(name: string, run: () => Promise<boolean | string>) {
  try {
    const result = await run();
    const ok = result === true;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `: ${result || "failed"}`}`);
  } catch (error) {
    failures++;
    console.log(`✗ ${name}: ${(error as Error).message}`);
  }
}

const fetchText = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, { redirect: "manual", ...init });
  return { res, body: await res.text() };
};

await check("home page renders with Markdown alternate", async () => {
  const { res, body } = await fetchText(`${base}/`);
  return res.status === 200 && body.includes('type="text/markdown"')
    ? true
    : `status ${res.status}`;
});
await check("Accept: text/markdown returns Markdown", async () => {
  const { res, body } = await fetchText(`${base}/about`, { headers: { accept: "text/markdown" } });
  return (res.headers.get("content-type") ?? "").includes("text/markdown") && body.startsWith("# ")
    ? true
    : `content-type ${res.headers.get("content-type")}`;
});
await check("AI crawler user agent gets Markdown", async () => {
  const { res } = await fetchText(`${base}/about`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2)" },
  });
  return (res.headers.get("content-type") ?? "").includes("text/markdown")
    ? true
    : `content-type ${res.headers.get("content-type")}`;
});
await check("llms.txt is served", async () => {
  const { res, body } = await fetchText(`${base}/llms.txt`);
  return res.status === 200 && body.startsWith("# ") ? true : `status ${res.status}`;
});
if (values.production) {
  await check("internal /v/ prefix is hidden", async () => {
    const { res } = await fetchText(
      `${base}/v/${loadVariantsFromDisk(process.cwd())[0]?.id ?? "x"}`,
    );
    return res.status === 404 ? true : `status ${res.status}`;
  });
}
await check("protected images require the password", async () => {
  const { res } = await fetchText(`${base}/protected/img/none--image-0000000000-480.webp`);
  return res.status === 401 ? true : `status ${res.status}`;
});
await check("wrong password is rejected without a cookie", async () => {
  const res = await fetch(`${base}/api/unlock`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: base },
    body: "password=definitely-wrong&next=/",
  });
  return res.status === 303 && !res.headers.get("set-cookie") ? true : `status ${res.status}`;
});

const homepage = (await fetchText(`${base}/`)).body;
const locked = homepage
  .split('<li class="card')
  .filter((card) => card.includes("Protected"))
  .map((card) => /href="\/work\/([^"]+)"/.exec(card)?.[1])
  .filter(Boolean);
for (const slug of locked.slice(0, 1)) {
  await check(`locked case study /work/${slug} shows the gate, not cached`, async () => {
    const { res, body } = await fetchText(`${base}/work/${slug}`);
    return body.includes('action="/api/unlock"') &&
      (res.headers.get("cache-control") ?? "").includes("no-store")
      ? true
      : `status ${res.status}, cache-control ${res.headers.get("cache-control")}`;
  });
}

if (values.variant) {
  const variant = values.variant.replace(/\/$/, "");
  await check("variant subdomain renders and is not indexed", async () => {
    const { res, body } = await fetchText(`${variant}/`);
    return res.status === 200 &&
      (res.headers.get("x-robots-tag") ?? "").includes("noindex") &&
      body.includes("noindex")
      ? true
      : `status ${res.status}, x-robots-tag ${res.headers.get("x-robots-tag")}`;
  });
  await check("variant has its own llms.txt", async () => {
    const { body } = await fetchText(`${variant}/llms.txt`);
    return body.includes("Prepared for") ? true : "missing variant note";
  });
}

// Warm the CDN for images on on-demand pages (first request runs sharp in the function).
const onDemand = [
  ...new Set([...homepage.matchAll(/href="(\/work\/[^"]+)"/g)].map((m) => m[1] ?? "")),
];
let warmed = 0;
for (const path of onDemand) {
  const { body } = await fetchText(`${base}${path}`);
  const images = [...body.matchAll(/\/_image\?[^"' ,]+/g)].map((m) => m[0].replace(/&amp;/g, "&"));
  for (const image of new Set(images)) {
    await fetch(`${base}${image}`);
    warmed++;
  }
}
console.log(`  warmed ${warmed} image variants`);
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
