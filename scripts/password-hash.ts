/**
 * Creates the environment values for the case study password.
 * Usage: npm run password:hash -- "the password"   (or without argument to type it in)
 * Put both lines into Vercel → Project → Settings → Environment Variables (and a local .env).
 */
import { createInterface } from "node:readline/promises";
import { toBase64Url } from "../src/lib/auth/encoding";
import { hashPassword } from "../src/lib/auth/password";

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Password: ");
  rl.close();
}
if (!password || password.length < 8) {
  console.error("Use at least 8 characters.");
  process.exit(1);
}
const iterations = Number(process.env.HASH_ITERATIONS ?? "") || undefined;
console.log(`LOCK_PASSWORD_HASH=${await hashPassword(password, iterations)}`);
console.log(`LOCK_COOKIE_SECRET=${toBase64Url(crypto.getRandomValues(new Uint8Array(32)))}`);
