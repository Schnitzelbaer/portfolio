import type { APIRoute } from "astro";
import { markdownResponse } from "../lib/agent/markdown";
import { aboutDocument } from "../lib/agent/pages";
import { pageContext } from "../lib/page";
import { site } from "../lib/site";

/** /about.md, built only while `pages.about` is on in content/site.yaml. */
export function getStaticPaths() {
  return site.pages.about ? [{ params: { about: "about" } }] : [];
}

export const GET: APIRoute = async () => markdownResponse(await aboutDocument(pageContext()));
