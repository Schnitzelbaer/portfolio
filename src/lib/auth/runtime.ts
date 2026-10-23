import { LOCK_COOKIE_SECRET, LOCK_PASSWORD_HASH } from "astro:env/server";
import type { AstroCookies } from "astro";
import { hashPassword, isPasswordHash, verifyPassword } from "./password";
import { COOKIE_NAME, createToken, MAX_AGE_SECONDS, verifyToken } from "./token";

interface LockConfig {
  hash: string;
  secret: string;
}

/** Password used by `npm run dev` when no LOCK_PASSWORD_HASH is set. */
export const DEV_PASSWORD = "preview";

let devConfig: Promise<LockConfig> | undefined;

/**
 * The configured hash and cookie secret. In production both must be set, otherwise nothing can
 * be unlocked (fail closed). The dev server falls back to the password "preview".
 */
export async function lockConfig(): Promise<LockConfig | undefined> {
  if (isPasswordHash(LOCK_PASSWORD_HASH) && LOCK_COOKIE_SECRET && LOCK_COOKIE_SECRET.length >= 32) {
    return { hash: LOCK_PASSWORD_HASH, secret: LOCK_COOKIE_SECRET };
  }
  if (import.meta.env.DEV) {
    devConfig ??= hashPassword(DEV_PASSWORD, 1000).then((hash) => ({
      hash,
      secret: "dev-only-cookie-secret-0123456789abcdef",
    }));
    return devConfig;
  }
  return undefined;
}

export async function isUnlocked(cookies: AstroCookies): Promise<boolean> {
  const config = await lockConfig();
  if (!config) return false;
  return verifyToken(cookies.get(COOKIE_NAME)?.value, config.secret, config.hash);
}

/** Checks the password and, if correct, returns the cookie value to set. */
export async function unlockToken(password: string): Promise<string | undefined> {
  const config = await lockConfig();
  if (!config || !password || password.length > 256) return undefined;
  if (!(await verifyPassword(password, config.hash))) return undefined;
  return createToken(config.secret, config.hash);
}

export function setUnlockCookie(cookies: AstroCookies, token: string, secure: boolean): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearUnlockCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

/** Only same-site relative paths are allowed as redirect targets. */
export function safeNext(next: unknown): string {
  const value = typeof next === "string" ? next : "";
  return /^\/(?![/\\])[^\s]*$/.test(value) ? value : "/";
}
