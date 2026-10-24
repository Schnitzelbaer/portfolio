import { open } from "node:fs/promises";
import type { APIRoute } from "astro";
import {
  mediaRange,
  PRIVATE_MEDIA_FILE,
  privateFilePath,
  privateManifest,
} from "../../../lib/private-assets";

export const prerender = false;

const deny = (status: number, extra: Record<string, string> = {}) =>
  new Response(status === 401 ? "Password required" : "Not found", {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", ...extra },
  });

/**
 * Locked videos, only for visitors with a valid unlock cookie. Supports Range requests and
 * answers in slices (see MEDIA_CHUNK_BYTES), so videos larger than a function response work.
 */
export const GET: APIRoute = async ({ params, locals, request }) => {
  if (!locals.unlocked) return deny(401);
  const name = params.file ?? "";
  const entry = PRIVATE_MEDIA_FILE.test(name) ? privateManifest().media[name] : undefined;
  if (!entry) return deny(404);
  const range = mediaRange(request.headers.get("range"), entry.size);
  if (!range) return deny(416, { "Content-Range": `bytes */${entry.size}` });
  const length = range.end - range.start + 1;
  const buffer = Buffer.alloc(length);
  const handle = await open(privateFilePath("media", name), "r");
  try {
    await handle.read(buffer, 0, length, range.start);
  } finally {
    await handle.close();
  }
  return new Response(new Uint8Array(buffer), {
    status: range.partial ? 206 : 200,
    headers: {
      "Content-Type": name.endsWith(".webm") ? "video/webm" : "video/mp4",
      "Content-Length": String(length),
      "Accept-Ranges": "bytes",
      ...(range.partial && { "Content-Range": `bytes ${range.start}-${range.end}/${entry.size}` }),
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
};
