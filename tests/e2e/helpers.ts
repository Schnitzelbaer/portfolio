import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export const PORT = 4400;
export const DOMAIN = "portfolio.localhost";
export const MAIN = `${DOMAIN}:${PORT}`;
export const variantHost = (id: string) => `${id}.${DOMAIN}:${PORT}`;
export const PASSWORD = "e2e-password";
export const COOKIE_SECRET = "e2e-cookie-secret-0123456789abcdef0123456789";
/** Hash of PASSWORD (test only, low iteration count for speed). */
export const PASSWORD_HASH =
  "pbkdf2-sha256$1000$MqBI9fy3Kk9VtTUNvKcvxg$1aBS8Y6wc5-B1MVNWPjosvPmG8-GOrgBsrT7nf5WtDc";

export interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

/** Plain HTTP request with full control over the Host header (Node fetch would override it). */
export function get(
  path: string,
  options: { host?: string; headers?: Record<string, string>; method?: string; body?: string } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method: options.method ?? "GET",
        headers: { host: options.host ?? MAIN, ...options.headers },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("latin1"),
          }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const root = process.cwd();

function frontmatter(text: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  return match ? ((parseYaml(match[1] ?? "") as Record<string, unknown>) ?? {}) : {};
}

/** Runs of 6+ plain words: robust against HTML escaping and typographic replacements. */
function fragments(text: string): string[] {
  const plain = text
    .replace(/^---\n[\s\S]*?\n---/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_`>|-]/g, " ");
  const runs = plain.match(/(?:\b[A-Za-z]{2,}\b[ ]+){5,}\b[A-Za-z]{2,}\b/g) ?? [];
  return [...new Set(runs.map((r) => r.replace(/\s+/g, " ").trim()))];
}

export interface Secret {
  /** Where it comes from, for readable failures. */
  source: string;
  value: string;
}

/**
 * Everything that must never be served without the password, derived from the content itself
 * so the tests keep working when real case studies replace the dummies.
 */
export function lockedSecrets(): Secret[] {
  const secrets: Secret[] = [];
  const workDir = join(root, "content", "work");
  for (const slug of readdirSync(workDir)) {
    const file = join(workDir, slug, "index.mdx");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const data = frontmatter(text);
    const publicText = [data.title, data.lead, data.outcome, data.coverAlt].join(" ");
    const lockedText =
      data.locked === true
        ? text
        : [...text.matchAll(/<Locked[^>]*>([\s\S]*?)<\/Locked>/g)]
            .map((m) => m[1] ?? "")
            .join("\n");
    for (const value of fragments(lockedText)) {
      if (!publicText.includes(value)) secrets.push({ source: `${slug} (locked text)`, value });
    }
  }
  const manifestFile = join(root, "private", "manifest.json");
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as {
      images: Record<string, unknown>;
      showcases: Record<string, string[]>;
    };
    for (const id of Object.keys(manifest.images))
      secrets.push({ source: "private image id", value: id });
    for (const [id, variants] of Object.entries(manifest.showcases)) {
      for (const variant of variants) {
        const bundle = readFileSync(
          join(root, "private", "showcases", id, `${variant}.js`),
          "utf8",
        );
        for (const value of bundle.match(/"[A-Z][a-z]+(?: [a-z]+){2,}[^"]{0,40}"/g)?.slice(0, 5) ??
          []) {
          secrets.push({ source: `locked showcase ${id}`, value: value.slice(1, -1) });
        }
      }
    }
  }
  return secrets;
}

export function leaks(body: string, secrets: Secret[]): Secret[] {
  const decoded = body
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  return secrets.filter((s) => decoded.includes(s.value));
}

export function lockedSlugs(): { locked: string[]; withLockedSection: string[] } {
  const workDir = join(root, "content", "work");
  const locked: string[] = [];
  const withLockedSection: string[] = [];
  for (const slug of readdirSync(workDir)) {
    const file = join(workDir, slug, "index.mdx");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    if (frontmatter(text).locked === true) locked.push(slug);
    else if (/<Locked[\s>]/.test(text)) withLockedSection.push(slug);
  }
  return { locked, withLockedSection };
}

export function variants(): Array<{ id: string; projects: string[]; intro?: string }> {
  const dir = join(root, "content", "variants");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({
      id: f.replace(/\.ya?ml$/, ""),
      ...(parseYaml(readFileSync(join(dir, f), "utf8")) as { projects: string[] }),
    }));
}

export function staticFiles(dir = join(root, ".vercel", "output", "static")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? staticFiles(path) : [path];
  });
}

export async function unlockCookie(host = MAIN): Promise<string> {
  const res = await get("/api/unlock", {
    host,
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: `http://${host}` },
    body: `password=${PASSWORD}&next=/`,
  });
  const cookie = [res.headers["set-cookie"] ?? []].flat()[0] ?? "";
  return cookie.split(";")[0] ?? "";
}
