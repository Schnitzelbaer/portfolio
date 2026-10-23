import type { APIRoute } from "astro";
import { pngResponse, renderOg } from "../lib/og";
import { site } from "../lib/site";

export const GET: APIRoute = async () =>
  pngResponse(
    await renderOg({
      eyebrow: `${site.name} · ${site.role}`,
      title: site.work.intro,
      footer: "Portfolio",
    }),
  );
