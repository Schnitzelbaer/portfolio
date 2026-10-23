import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";
import { PRIVATE_IMAGE_FILE, privateFilePath, privateManifest } from "../../../lib/private-assets";

export const prerender = false;

const deny = (status: number) =>
  new Response(status === 401 ? "Password required" : "Not found", {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });

/** Locked images, only for visitors with a valid unlock cookie. Lookup by manifest only. */
export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.unlocked) return deny(401);
  const match = PRIVATE_IMAGE_FILE.exec(params.file ?? "");
  const image = match ? privateManifest().images[match[1] ?? ""] : undefined;
  if (!match || !image?.widths.includes(Number(match[2]))) return deny(404);
  try {
    const data = await readFile(privateFilePath("img", match[0]));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": `image/${match[3]}`,
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return deny(404);
  }
};
