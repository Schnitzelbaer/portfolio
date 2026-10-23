import { fromBase64Url, timingSafeEqual, toBase64Url } from "./encoding";

/**
 * Password hashing with PBKDF2-SHA256 (Web Crypto, works in Node and edge runtimes).
 * Stored format: `pbkdf2-sha256$<iterations>$<salt>$<hash>` (base64url).
 * Only this hash is configured (LOCK_PASSWORD_HASH); the password itself is never stored.
 */
export const DEFAULT_ITERATIONS = 310_000;

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(
  password: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export function isPasswordHash(value: string | undefined): value is string {
  return /^pbkdf2-sha256\$\d+\$[\w-]+\$[\w-]+$/.test(value ?? "");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isPasswordHash(stored)) return false;
  const [, iterations, salt, hash] = stored.split("$");
  const expected = fromBase64Url(hash ?? "");
  const actual = await derive(password, fromBase64Url(salt ?? ""), Number(iterations));
  return timingSafeEqual(actual, expected);
}
