/**
 * Local stand-in for Vercel, used by the e2e tests and for production previews.
 *
 * It serves the real build output (`.vercel/output`): routes from `config.json` (including the
 * routing table written by `vercel-routes.ts`), static files, and the real server function,
 * which receives the original request URL like on Vercel.
 *
 * Usage: npm run build && npm run preview -- [--port 4400]
 * Open http://portfolio.localhost:4400 and http://<variant>.portfolio.localhost:4400.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

interface Route {
  src?: string;
  dest?: string;
  status?: number;
  headers?: Record<string, string>;
  continue?: boolean;
  handle?: string;
  has?: Array<{ type: string; key?: string; value?: string }>;
}

const { values } = parseArgs({ options: { port: { type: "string", default: "4400" } } });
const output = resolve(".vercel/output");
const staticDir = join(output, "static");
const functionDir = join(output, "functions", "_render.func");
const config = JSON.parse(readFileSync(join(output, "config.json"), "utf8")) as { routes: Route[] };
const split = config.routes.findIndex((r) => r.handle === "filesystem");
const beforeFs = config.routes.slice(0, split);
const afterFs = config.routes.slice(split + 1).filter((r) => !r.handle);

const vcConfig = JSON.parse(readFileSync(join(functionDir, ".vc-config.json"), "utf8")) as {
  handler: string;
};
// Vercel runs the function from its own folder; included files (private/) are relative to it.
process.chdir(functionDir);
const handler = (await import(pathToFileURL(join(functionDir, vcConfig.handler)).href)).default as {
  fetch(request: Request): Promise<Response>;
};

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json",
};

function staticFile(path: string): string | undefined {
  const clean = decodeURIComponent(path).replace(/\/+$/, "") || "/";
  for (const candidate of [clean, `${clean}.html`, join(clean, "index.html")]) {
    const file = join(staticDir, candidate);
    if (!file.startsWith(staticDir)) return undefined;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return undefined;
}

function matches(route: Route, path: string, req: IncomingMessage): RegExpExecArray | null {
  if (!route.src) return null;
  for (const condition of route.has ?? []) {
    const actual =
      condition.type === "host"
        ? (req.headers.host ?? "").replace(/:\d+$/, "")
        : String(req.headers[(condition.key ?? "").toLowerCase()] ?? "");
    if (!new RegExp(condition.value ?? ".*").test(actual)) return null;
  }
  return new RegExp(route.src).exec(path);
}

const fill = (template: string, match: RegExpExecArray) =>
  template.replace(/\$(\d)/g, (_, i) => match[Number(i)] ?? "");

async function callFunction(
  req: IncomingMessage,
  res: ServerResponse,
  headers: Record<string, string>,
) {
  const url = `http://${req.headers.host}${req.url}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  const forwarded: Array<[string, string]> = [
    ["x-forwarded-for", req.socket.remoteAddress ?? "127.0.0.1"],
  ];
  const request = new Request(url, {
    method: req.method,
    headers: [...forwarded, ...Object.entries(req.headers)].flatMap(([k, v]) =>
      v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x): [string, string] => [k, x]),
    ),
    ...(body && { body: new Uint8Array(body) }),
  });
  const response = await handler.fetch(request);
  const out: Record<string, string | string[]> = { ...headers };
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    out[key] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) out["set-cookie"] = cookies;
  res.writeHead(response.status, out);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function serveFile(
  res: ServerResponse,
  file: string,
  status: number,
  headers: Record<string, string>,
) {
  res.writeHead(status, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    ...headers,
  });
  res.end(readFileSync(file));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    let path = url.pathname;
    let status: number | undefined;
    const headers: Record<string, string> = {};

    for (const route of beforeFs) {
      const match = matches(route, path, req);
      if (!match) continue;
      if (route.headers && route.status && route.headers.Location) {
        res.writeHead(route.status, { ...headers, location: fill(route.headers.Location, match) });
        res.end();
        return;
      }
      if (route.headers) Object.assign(headers, route.headers);
      if (route.status) status = route.status;
      if (route.dest) path = fill(route.dest, match).split("?")[0] ?? path;
      if (route.dest && !route.continue) break;
    }

    const file = staticFile(path);
    if (file) return serveFile(res, file, status ?? 200, headers);

    for (const route of afterFs) {
      const match = matches(route, path, req);
      if (!match) continue;
      if (route.dest === "_render" || route.dest?.startsWith("/_render"))
        return await callFunction(req, res, headers);
      if (route.headers) Object.assign(headers, route.headers);
      if (route.status) status = route.status;
      if (route.dest) {
        const target = staticFile(fill(route.dest, match));
        if (target) return serveFile(res, target, status ?? 200, headers);
      }
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Preview server error");
  }
}).listen(Number(values.port), () => {
  console.log(
    `Preview: http://portfolio.localhost:${values.port} (variants: http://<id>.portfolio.localhost:${values.port})`,
  );
});
