import type { APIRoute, GetStaticPaths } from "astro";
import { getVariants } from "../../../lib/variants";

export const getStaticPaths = (async () =>
  (await getVariants()).map((variant) => ({
    params: { variant: variant.id },
  }))) satisfies GetStaticPaths;

/** Crawling stays allowed so crawlers can see the noindex header; there is no sitemap. */
export const GET: APIRoute = () =>
  new Response("User-agent: *\nAllow: /\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
