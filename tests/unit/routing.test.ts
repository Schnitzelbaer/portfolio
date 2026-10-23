import { describe, expect, it } from "vitest";
import { interpret } from "../../src/lib/routing/interpret";
import { buildRules } from "../../src/lib/routing/rules";
import { toVercelRoutes } from "../../src/lib/routing/to-vercel";

const rules = buildRules({
  domain: "example.ch",
  variants: [
    { id: "acme", indexable: false },
    { id: "open", indexable: true },
  ],
  production: true,
  agentUserAgents: ["GPTBot", "ClaudeBot"],
});

const req = (host: string, path: string, headers: Record<string, string> = {}) =>
  interpret(rules, { host, path, headers });

describe("routing table", () => {
  it("leaves main pages alone and marks them as negotiated", () => {
    const result = req("example.ch", "/work/demo");
    expect(result.action).toEqual({ type: "none" });
    expect(result.headers.Vary).toBe("Accept, User-Agent");
  });

  it("negotiates Markdown by Accept header and known agents", () => {
    expect(req("example.ch", "/", { accept: "text/markdown" }).action).toEqual({
      type: "rewrite",
      path: "/index.md",
    });
    expect(
      req("example.ch", "/work/demo/", { accept: "text/markdown, text/html;q=0.5" }).action,
    ).toEqual({
      type: "rewrite",
      path: "/work/demo.md",
    });
    expect(
      req("example.ch", "/about", { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2)" }).action,
    ).toEqual({
      type: "rewrite",
      path: "/about.md",
    });
    expect(req("example.ch", "/llms.txt", { accept: "text/markdown" }).action).toEqual({
      type: "none",
    });
  });

  it("serves variants on their subdomain, not indexed", () => {
    const result = req("acme.example.ch:443", "/work/demo");
    expect(result.action).toEqual({ type: "rewrite", path: "/v/acme/work/demo" });
    expect(result.headers["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(req("acme.example.ch", "/").action).toEqual({ type: "rewrite", path: "/v/acme" });
    expect(req("acme.example.ch", "/robots.txt").action).toEqual({
      type: "rewrite",
      path: "/v/acme/robots.txt",
    });
    expect(req("acme.example.ch", "/", { accept: "text/markdown" }).action).toEqual({
      type: "rewrite",
      path: "/v/acme/index.md",
    });
    expect(req("open.example.ch", "/").headers["X-Robots-Tag"]).toBeUndefined();
  });

  it("shares assets, the API and private files across hosts", () => {
    for (const path of ["/_astro/app.js", "/api/unlock", "/protected/img/x.webp", "/favicon.svg"]) {
      expect(req("acme.example.ch", path).action).toEqual({ type: "none" });
    }
  });

  it("hides the internal prefix and redirects stray hosts", () => {
    expect(req("example.ch", "/v/acme/").action).toEqual({ type: "status", status: 404 });
    expect(req("www.example.ch", "/about").action).toEqual({
      type: "redirect",
      location: "https://example.ch/about",
      status: 308,
    });
    expect(req("nope.example.ch", "/about").action).toMatchObject({
      type: "redirect",
      location: "https://example.ch/",
    });
    expect(req("project.vercel.app", "/about").action).toEqual({ type: "none" });
  });

  it("serializes to Vercel routes with matching conditions", () => {
    const routes = toVercelRoutes(rules);
    expect(routes[0]).toMatchObject({ continue: true, headers: { Vary: "Accept, User-Agent" } });
    expect(routes).toContainEqual({
      src: "^/$",
      has: [
        { type: "host", value: "^acme\\.example\\.ch$" },
        { type: "header", key: "accept", value: ".*text/markdown.*" },
      ],
      dest: "/v/acme/index.md",
    });
    expect(routes).toContainEqual({ src: "^/v(?:/.*)?$", status: 404, dest: "/404.html" });
  });
});
