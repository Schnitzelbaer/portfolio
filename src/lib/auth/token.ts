import { fromBase64Url, timingSafeEqual, toBase64Url } from "./encoding";

/**
 * Unlock token stored in an httpOnly cookie: `v1.<expires>.<signature>`.
 * The HMAC-SHA256 signature covers the expiry and a fingerprint of the password hash, so
 * changing the password invalidates every existing cookie.
 */
export const COOKIE_NAME = "pf_unlock";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

async function sign(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function fingerprint(passwordHash: string): string {
  return passwordHash.slice(-16);
}

export async function createToken(
  secret: string,
  passwordHash: string,
  now = Date.now(),
  maxAgeSeconds = MAX_AGE_SECONDS,
): Promise<string> {
  const expires = Math.floor(now / 1000) + maxAgeSeconds;
  const signature = await sign(secret, `v1.${expires}.${fingerprint(passwordHash)}`);
  return `v1.${expires}.${toBase64Url(signature)}`;
}

export async function verifyToken(
  token: string | undefined,
  secret: string,
  passwordHash: string,
  now = Date.now(),
): Promise<boolean> {
  const match = /^v1\.(\d{1,12})\.([\w-]{20,})$/.exec(token ?? "");
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires * 1000 <= now) return false;
  const expected = await sign(secret, `v1.${expires}.${fingerprint(passwordHash)}`);
  let actual: Uint8Array;
  try {
    actual = fromBase64Url(match[2] ?? "");
  } catch {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
