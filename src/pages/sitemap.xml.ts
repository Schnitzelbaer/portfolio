import type { APIRoute } from "astro";
import { getWork } from "../lib/work";

/** Main domain only. Application variants and locked case studies are never listed. */
export const GET: APIRoute = async ({ site }) => {
  const work = (await getWork()).filter((entry) => !entry.data.locked);
  const urls = [
    { path: "/", lastmod: undefined },
    { path: "/about", lastmod: undefined },
    ...work.map((entry) => ({
      path: `/work/${entry.id}`,
      lastmod: entry.data.date.toISOString().slice(0, 10),
    })),
  ];
  const body = urls
    .map(
      ({ path, lastmod }) =>
        `  <url><loc>${new URL(path, site).href}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
