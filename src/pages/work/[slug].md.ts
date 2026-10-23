import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "../../lib/agent/markdown";
import { caseStudyDocument } from "../../lib/agent/pages";
import { isGated, pageContext } from "../../lib/page";
import { getWork, type WorkEntry } from "../../lib/work";

/** Public case studies as Markdown. Gated ones are answered by `[...gated].astro`. */
export const getStaticPaths = (async () =>
  (await getWork())
    .filter((entry) => !isGated(entry))
    .map((entry) => ({ params: { slug: entry.id }, props: { entry } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  markdownResponse(caseStudyDocument((props as { entry: WorkEntry }).entry, pageContext(), false));
