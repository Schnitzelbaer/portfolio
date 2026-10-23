import type { ImageMetadata } from "astro";
import type { ShowcaseConfig } from "./tour/types";

/**
 * Showcase configs, keyed by folder name. Public showcases live in `showcases/<id>/`,
 * showcases that may only be served behind the password gate in `showcases/_locked/<id>/`.
 * Locked configs must not import images: anything imported here could end up in public assets.
 */
const publicConfigs = import.meta.glob<{ default: ShowcaseConfig }>(
  "/showcases/*/showcase.config.ts",
  {
    eager: true,
  },
);
const lockedConfigs = import.meta.glob<{ default: ShowcaseConfig }>(
  "/showcases/_locked/*/showcase.config.ts",
  { eager: true },
);

/** Static first frames, discovered by file name: `showcases/<id>/fallback-<variant>.webp`. */
const fallbackImages = import.meta.glob<ImageMetadata>("/showcases/*/fallback-*.{webp,png,jpg}", {
  eager: true,
  import: "default",
});

export interface ShowcaseEntry {
  id: string;
  config: ShowcaseConfig;
  locked: boolean;
}

function index(modules: Record<string, { default: ShowcaseConfig }>, locked: boolean) {
  return Object.entries(modules).map(([path, mod]): ShowcaseEntry => {
    const id = path.split("/").at(-2) ?? path;
    const config = { ...mod.default };
    if (!locked) {
      const fallbacks: Record<string, ImageMetadata> = { ...config.fallbacks };
      for (const [file, image] of Object.entries(fallbackImages)) {
        const match = new RegExp(`^/showcases/${id}/fallback-([\\w-]+)\\.\\w+$`).exec(file);
        if (match?.[1]) fallbacks[match[1]] ??= image;
      }
      config.fallbacks = fallbacks;
    }
    return { id, config, locked };
  });
}

const all = [...index(publicConfigs, false), ...index(lockedConfigs, true)];

export function getShowcase(id: string): ShowcaseEntry | undefined {
  return all.find((entry) => entry.id === id);
}

export function listShowcases(): ShowcaseEntry[] {
  return all;
}
