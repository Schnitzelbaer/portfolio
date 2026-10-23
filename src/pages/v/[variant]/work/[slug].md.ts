import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "../../../../lib/agent/markdown";
import { caseStudyDocument } from "../../../../lib/agent/pages";
import { isGated, pageContext } from "../../../../lib/page";
import { getVariants, getVariantWork, type Variant } from "../../../../lib/variants";
import type { WorkEntry } from "../../../../lib/work";

export const getStaticPaths = (async () => {
  const paths = [];
  for (const variant of await getVariants()) {
    for (const entry of (await getVariantWork(variant)).filter((e) => !isGated(e))) {
      paths.push({ params: { variant: variant.id, slug: entry.id }, props: { variant, entry } });
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { variant, entry } = props as { variant: Variant; entry: WorkEntry };
  return markdownResponse(caseStudyDocument(entry, pageContext(variant), false));
};
