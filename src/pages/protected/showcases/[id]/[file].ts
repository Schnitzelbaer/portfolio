import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";
import {
  PRIVATE_SHOWCASE_FILE,
  privateFilePath,
  privateManifest,
} from "../../../../lib/private-assets";

export const prerender = false;

const deny = (status: number) =>
  new Response(status === 401 ? "Password required" : "Not found", {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });

/** Bundles of locked showcases, only for visitors with a valid unlock cookie. */
export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.unlocked) return deny(401);
  const id = params.id ?? "";
  const match = PRIVATE_SHOWCASE_FILE.exec(params.file ?? "");
  if (!match || !privateManifest().showcases[id]?.includes(match[1] ?? "")) return deny(404);
  try {
    const data = await readFile(privateFilePath("showcases", id, match[0]), "utf8");
    return new Response(data, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return deny(404);
  }
};
