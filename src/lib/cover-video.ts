/**
 * Optional cover video of a case study, found by convention next to its index.mdx:
 * `cover.mp4` / `cover.webm` replace the cover image at the top of the case study, and
 * `cover-card.mp4` / `cover-card.webm` (a smaller encode) play on the project card. The cover
 * image stays as poster and fallback. Only these names are matched, so videos inside the body
 * (in `videos/`, possibly locked) never reach the public build through this glob.
 */
const files = import.meta.glob<string>("/content/work/*/cover{,-card}.{mp4,webm}", {
  query: "?url",
  import: "default",
  eager: true,
});

export interface VideoSources {
  mp4?: string;
  webm?: string;
}

export interface CoverVideo {
  page: VideoSources;
  card: VideoSources;
}

function sources(slug: string, name: string): VideoSources | undefined {
  const mp4 = files[`/content/work/${slug}/${name}.mp4`];
  const webm = files[`/content/work/${slug}/${name}.webm`];
  return mp4 || webm ? { mp4, webm } : undefined;
}

export function coverVideo(slug: string): CoverVideo | undefined {
  const page = sources(slug, "cover");
  if (!page) return undefined;
  return { page, card: sources(slug, "cover-card") ?? page };
}
