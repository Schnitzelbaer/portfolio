import { createHash } from "node:crypto";
import { basename, extname } from "node:path";

/** Image formats the private pipeline can process. */
export const PRIVATE_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export function isRelativeAsset(src: string | undefined): src is string {
  return typeof src === "string" && (src.startsWith("./") || src.startsWith("../"));
}

/**
 * Stable, opaque id for an image that must only be served behind the password gate.
 * The id never contains the original folder structure, only a readable stem plus a hash.
 */
export function privateImageId(entrySlug: string, relativeSrc: string): string {
  const stem = basename(relativeSrc, extname(relativeSrc))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hash = createHash("sha256")
    .update(`${entrySlug}:${relativeSrc}`)
    .digest("hex")
    .slice(0, 10);
  return `${entrySlug}--${stem || "image"}-${hash}`;
}

/** Extracts the entry slug from a content file path like `…/content/work/<slug>/index.mdx`. */
export function entrySlugFromPath(filePath: string): string | undefined {
  const match = /[\\/]content[\\/](?:work|pages)[\\/]([^\\/]+?)(?:[\\/]index)?\.mdx?$/.exec(
    filePath,
  );
  return match?.[1];
}

/** File name of a locked video in `private/media/`: opaque id plus the original extension. */
export function privateMediaFile(entrySlug: string, relativeSrc: string): string {
  return `${privateImageId(entrySlug, relativeSrc)}${extname(relativeSrc).toLowerCase()}`;
}
