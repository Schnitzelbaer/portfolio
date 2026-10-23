import type { APIRoute, GetStaticPaths } from "astro";
import { llmsTxt } from "../../../lib/agent/pages";
import { pageContext, workFor } from "../../../lib/page";
import { getVariants, type Variant } from "../../../lib/variants";

export const getStaticPaths = (async () =>
  (await getVariants()).map((variant) => ({
    params: { variant: variant.id },
    props: { variant },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { variant } = props as { variant: Variant };
  return new Response(llmsTxt(await workFor(variant), pageContext(variant)), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
