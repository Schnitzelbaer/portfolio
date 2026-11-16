import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "../../../lib/agent/markdown";
import { aboutDocument } from "../../../lib/agent/pages";
import { pageContext } from "../../../lib/page";
import { site } from "../../../lib/site";
import { getVariants, type Variant } from "../../../lib/variants";

/** The variant's /about.md, built only while `pages.about` is on in content/site.yaml. */
export const getStaticPaths = (async () =>
  site.pages.about
    ? (await getVariants()).map((variant) => ({
        params: { variant: variant.id, about: "about" },
        props: { variant },
      }))
    : []) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  markdownResponse(await aboutDocument(pageContext((props as { variant: Variant }).variant)));
