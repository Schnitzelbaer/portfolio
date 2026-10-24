import { getEntry } from "astro:content";
import type { PageContext } from "../page";
import { site } from "../site";
import type { WorkEntry } from "../work";
import { caseStudyMarkdown, type MarkdownContext, mdxToMarkdown } from "./markdown";

/** Markdown documents for agents, per page. Locked content only with `unlocked`. */

export function markdownContext(unlocked: boolean): MarkdownContext {
  return { unlocked };
}

const mdUrl = (context: PageContext, path: string) =>
  `${context.origin}${path === "/" ? "/index" : path}.md`;

export function caseStudyDocument(
  entry: WorkEntry,
  context: PageContext,
  unlocked: boolean,
): string {
  return caseStudyMarkdown(entry.data, entry.body, {
    url: `${context.origin}/work/${entry.id}`,
    ctx: markdownContext(unlocked),
  });
}

export function workDocument(entries: WorkEntry[], context: PageContext): string {
  const greeting = context.variant?.intro ? `${context.variant.intro}\n\n` : "";
  const list = entries
    .map(
      (e) =>
        `- [${e.data.title}](${mdUrl(context, `/work/${e.id}`)})${e.data.locked ? " (password protected)" : ""}: ${e.data.outcome} Role: ${e.data.keyFacts.role}.`,
    )
    .join("\n");
  return `# ${site.name}, ${site.role}\n\n${greeting}> ${site.work.intro}\n\n## Case studies\n\n${list}\n\n## More\n\n- [About ${site.name}](${mdUrl(context, "/about")})\n- [Index for agents](${context.origin}/llms.txt)\n`;
}

export async function aboutDocument(context: PageContext): Promise<string> {
  const about = await getEntry("pages", "about");
  if (!about) return `# ${site.name}\n`;
  const { tagline, tags, experience } = about.data;
  const body = mdxToMarkdown(about.body ?? "", markdownContext(false));
  const jobs = experience.map((j) => `- ${j.company}: ${j.role} (${j.from} to ${j.to})`).join("\n");
  const links = [
    ...site.links.map((l) => `- [${l.label}](${l.href})`),
    `- Email: ${site.email}`,
  ].join("\n");
  return [
    `# ${site.name}`,
    `${site.role} in ${site.location}.`,
    tagline ? `**${tagline}**` : "",
    body,
    tags.length ? `## Focus areas\n\n${tags.map((t) => `- ${t}`).join("\n")}` : "",
    jobs ? `## Experience\n\n${jobs}` : "",
    `## Contact\n\n${links}`,
    `Web version: ${context.origin}/about`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}

/** https://llmstxt.org */
export function llmsTxt(entries: WorkEntry[], context: PageContext): string {
  const work = entries
    .map(
      (e) =>
        `- [${e.data.title}](${mdUrl(context, `/work/${e.id}`)}): ${e.data.outcome}${e.data.locked ? " Password protected; only title, summary and key facts are public." : ""}`,
    )
    .join("\n");
  const greeting = context.variant ? `\n\nPrepared for ${context.variant.company}.` : "";
  return `# ${site.name}\n\n> ${site.work.intro}${greeting}\n\nEvery page is available as Markdown: append \`.md\` to the URL or send \`Accept: text/markdown\`.\n\n## Pages\n\n- [Work](${mdUrl(context, "/")}): Overview of selected case studies.\n- [About](${mdUrl(context, "/about")}): Background, experience and contact.\n\n## Case studies\n\n${work}\n`;
}

/** True when the request asks for Markdown (Accept header or a known AI agent). */
export function wantsMarkdown(request: Request): boolean {
  if ((request.headers.get("accept") ?? "").includes("text/markdown")) return true;
  const ua = request.headers.get("user-agent") ?? "";
  return site.agents.userAgents.some((agent) => ua.includes(agent));
}
