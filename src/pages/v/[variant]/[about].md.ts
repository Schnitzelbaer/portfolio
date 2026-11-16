import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "../../../lib/agent/markdown";
import { aboutDocument } from "../../../lib/agent/pages";
import { pageContext } from "../../../lib/page";
import { getVariants, type Variant } from "../../../lib/variants";

export const getStaticPaths = (async () =>
  (await getVariants()).map((variant) => ({
    params: { variant: variant.id },
    props: { variant },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  markdownResponse(await aboutDocument(pageContext((props as { variant: Variant }).variant)));
