import type { APIRoute, GetStaticPaths } from "astro";
import { pngResponse, renderOg } from "../../../lib/og";
import { site } from "../../../lib/site";
import { getVariants, type Variant } from "../../../lib/variants";

export const getStaticPaths = (async () =>
  (await getVariants()).map((variant) => ({
    params: { variant: variant.id },
    props: { variant },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { variant } = props as { variant: Variant };
  return pngResponse(
    await renderOg({
      eyebrow: `${site.name} · ${site.role}`,
      title: `Selected work for ${variant.company}`,
      subtitle: site.work.intro,
      footer: "Portfolio",
    }),
  );
};
