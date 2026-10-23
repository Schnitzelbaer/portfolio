import { describe, expect, it } from "vitest";
import { hashPassword, isPasswordHash, verifyPassword } from "../../src/lib/auth/password";
import { createToken, verifyToken } from "../../src/lib/auth/token";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse", 1000);
    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("correct horse ", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "plain-text-password")).toBe(false);
  });
});

describe("unlock token", () => {
  const secret = "test-secret-with-enough-entropy";
  const hash = "pbkdf2-sha256$1000$c2FsdA$aGFzaGhhc2hoYXNoaGFzaA";

  it("accepts a fresh token", async () => {
    const token = await createToken(secret, hash);
    expect(await verifyToken(token, secret, hash)).toBe(true);
  });

  it("rejects tampered, expired, foreign and malformed tokens", async () => {
    const token = await createToken(secret, hash);
    const [v, exp, sig] = token.split(".");
    expect(await verifyToken(`${v}.${Number(exp) + 3600}.${sig}`, secret, hash)).toBe(false);
    expect(await verifyToken(`${token.slice(0, -2)}AA`, secret, hash)).toBe(false);
    const expired = await createToken(secret, hash, Date.now() - 31 * 86_400_000);
    expect(await verifyToken(expired, secret, hash)).toBe(false);
    expect(await verifyToken(token, "another-secret-value-123", hash)).toBe(false);
    expect(await verifyToken(token, secret, `${hash}changed`)).toBe(false);
    expect(await verifyToken(undefined, secret, hash)).toBe(false);
    expect(await verifyToken("v1.123.short", secret, hash)).toBe(false);
  });
});
