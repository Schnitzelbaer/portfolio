import type { APIRoute } from "astro";
import { safeNext, setUnlockCookie, unlockToken } from "../../lib/auth/runtime";

export const prerender = false;

/** Best-effort throttling per server instance: a few attempts per IP and window. */
const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function withParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}#unlock`;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const form = await request.formData().catch(() => undefined);
  const next = safeNext(form?.get("next"));
  const headers = { "Cache-Control": "no-store" };
  if (throttled(clientIp(request))) {
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: withParam(next, "unlock", "throttled") },
    });
  }
  const token = await unlockToken(String(form?.get("password") ?? ""));
  if (!token) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: withParam(next, "unlock", "failed") },
    });
  }
  setUnlockCookie(cookies, token, url.protocol === "https:");
  return new Response(null, { status: 303, headers: { ...headers, Location: next } });
};
