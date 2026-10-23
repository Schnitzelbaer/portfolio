import type { APIRoute, GetStaticPaths } from "astro";
import { pngResponse, renderOg } from "../../../lib/og";
import { site } from "../../../lib/site";
import { getWork, type WorkEntry } from "../../../lib/work";

export const getStaticPaths = (async () =>
  (await getWork()).map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { data } = (props as { entry: WorkEntry }).entry;
  return pngResponse(
    await renderOg({
      eyebrow: `Case study · ${data.keyFacts.client}`,
      title: data.title,
      subtitle: data.outcome,
      footer: site.name,
      locked: data.locked,
    }),
  );
};
