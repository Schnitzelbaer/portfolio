import type { PageContext } from "../page";
import { workFor } from "../page";
import type { Variant } from "../variants";
import { aboutDocument, caseStudyDocument, workDocument } from "./pages";

export interface AgentViewPath {
  params: { path: string | undefined };
  props: { title: string; markdown: string; path: string };
}

/** Agent views for every page of a context. Gated case studies only show their public part. */
export async function agentViewPaths(
  context: PageContext,
  variant: Variant | undefined,
): Promise<AgentViewPath[]> {
  const work = await workFor(variant);
  return [
    {
      params: { path: undefined },
      props: { title: "Work", markdown: workDocument(work, context), path: "/" },
    },
    {
      params: { path: "about" },
      props: { title: "About", markdown: await aboutDocument(context), path: "/about" },
    },
    ...work.map((entry) => ({
      params: { path: `work/${entry.id}` },
      props: {
        title: entry.data.title,
        markdown: caseStudyDocument(entry, context, false),
        path: `/work/${entry.id}`,
      },
    })),
  ];
}
