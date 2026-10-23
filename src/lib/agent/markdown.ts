import type { BlockContent, Paragraph, PhrasingContent, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { BlockName } from "../../components/blocks/names";
import { tokenizePlaceholders } from "../content/placeholders";

/**
 * Agent-friendly Markdown, generated from the same MDX source as the HTML pages.
 * Every block has a serializer; locked content is replaced by a notice unless `unlocked`.
 */

export interface MarkdownContext {
  /** Visitor has a valid unlock cookie (on-demand routes only). */
  unlocked: boolean;
  /** Title and description of a showcase for its text alternative. */
  describeShowcase: (
    id: string,
  ) => { title: string; description: string; locked: boolean } | undefined;
}

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;
type Serializer = (
  node: JsxElement,
  children: RootContent[],
  ctx: MarkdownContext,
) => RootContent[];

const LOCK_NOTICE = "This part is password protected. Ask Simon for access.";

const text = (value: string): PhrasingContent => ({ type: "text", value });
const strong = (value: string): PhrasingContent => ({ type: "strong", children: [text(value)] });
const emphasis = (value: string): PhrasingContent => ({
  type: "emphasis",
  children: [text(value)],
});
const paragraph = (...children: PhrasingContent[]): Paragraph => ({ type: "paragraph", children });
const blockquote = (children: RootContent[]): RootContent => ({
  type: "blockquote",
  children: children as BlockContent[],
});

function attr(node: JsxElement, name: string): string | undefined {
  const found = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === name,
  );
  return typeof found?.value === "string" ? found.value : undefined;
}

function isInline(node: JsxElement): boolean {
  return node.type === "mdxJsxTextElement";
}

function imageText(node: JsxElement): string {
  const alt = attr(node, "alt") ?? "";
  return alt ? `[Image: ${alt}]` : "[Image]";
}

const serializers: Record<BlockName, Serializer> = {
  Decision: (node, children) => [
    blockquote([paragraph(strong(`Decision: ${attr(node, "title") ?? ""}`)), ...children]),
  ],
  Figure: (node) => {
    const caption = attr(node, "caption");
    const parts = [text(imageText(node)), ...(caption ? [text(" "), emphasis(caption)] : [])];
    return isInline(node) ? parts : [paragraph(...parts)];
  },
  FigureGroup: (node, children) => {
    const caption = attr(node, "caption");
    return [...children, ...(caption ? [paragraph(emphasis(caption))] : [])];
  },
  Compare: (node, children) => {
    const caption = attr(node, "caption");
    const label = attr(node, "kind") === "variants" ? "Variant comparison" : "Before and after";
    return [
      paragraph(strong(`${label}:`)),
      ...children,
      ...(caption ? [paragraph(emphasis(caption))] : []),
    ];
  },
  Variant: (node) => [
    paragraph(strong(`${attr(node, "label") ?? "Variant"}:`), text(` ${imageText(node)}`)),
  ],
  Outcome: (node, children) => {
    const label = attr(node, "type") === "expected" ? "Expected outcome" : "Achieved outcome";
    const title = attr(node, "title");
    return [paragraph(strong(title ? `${label}: ${title}` : label)), ...children];
  },
  Callout: (node, children) => {
    const head = [attr(node, "icon"), attr(node, "title")].filter(Boolean).join(" ");
    return [blockquote([...(head ? [paragraph(strong(head))] : []), ...children])];
  },
  Quote: (node, children) => {
    const by = [attr(node, "author"), attr(node, "role")].filter(Boolean).join(", ");
    return [blockquote([...children, ...(by ? [paragraph(text(`— ${by}`))] : [])])];
  },
  Columns: (_, children) => children,
  Column: (node, children) => {
    const title = attr(node, "title");
    return [...(title ? [paragraph(strong(title))] : []), ...children];
  },
  Reflection: (node, children) => [
    { type: "heading", depth: 2, children: [text(attr(node, "title") ?? "Reflection")] },
    ...children,
  ],
  Toggle: (node, children) => [paragraph(strong(attr(node, "summary") ?? "")), ...children],
  Showcase: (node, _, ctx) => {
    const id = attr(node, "id") ?? "";
    const info = ctx.describeShowcase(id);
    const caption = attr(node, "caption");
    if (!info || (info.locked && !ctx.unlocked)) {
      return [paragraph(text("[Interactive prototype, password protected]"))];
    }
    return [
      paragraph(strong(`Interactive tour: ${info.title}.`), text(` ${info.description}`)),
      ...(caption ? [paragraph(emphasis(caption))] : []),
    ];
  },
  Locked: (node, children, ctx) =>
    ctx.unlocked
      ? children
      : [
          blockquote([
            paragraph(
              strong(`🔒 ${attr(node, "title") ?? "Protected section"}`),
              text(` ${LOCK_NOTICE}`),
            ),
          ]),
        ],
  Placeholder: (node) => {
    const value = text(`[Image placeholder: ${attr(node, "label") ?? ""}]`);
    return isInline(node) ? [value] : [paragraph(value)];
  },
  Gap: () => [text("[…]")],
};

export const SERIALIZED_BLOCKS = Object.keys(serializers) as BlockName[];

function isJsx(node: { type: string }): node is JsxElement {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

/** Converts JSX blocks bottom-up into plain Markdown nodes. */
function transform(nodes: RootContent[], ctx: MarkdownContext): RootContent[] {
  return nodes.flatMap((node): RootContent[] => {
    if (node.type === "mdxjsEsm" || node.type === "yaml" || node.type === "mdxFlowExpression")
      return [];
    if ("children" in node && Array.isArray(node.children)) {
      (node as { children: RootContent[] }).children = transform(
        node.children as RootContent[],
        ctx,
      );
    }
    if (!isJsx(node)) return [node];
    const serializer = node.name ? serializers[node.name as BlockName] : undefined;
    if (!serializer) throw new Error(`No Markdown serializer for <${node.name ?? "fragment"}>`);
    return serializer(node, node.children as RootContent[], ctx);
  });
}

/** `[Screen: …]` → placeholder text; other text untouched. */
function replacePlaceholders(tree: Root) {
  visit(tree, "text", (node, index, parent) => {
    if (!parent || index === undefined) return;
    const tokens = tokenizePlaceholders(node.value);
    if (tokens.length === 1 && tokens[0]?.type === "text") return;
    node.value = tokens
      .map((t) =>
        t.type === "screen"
          ? `[Image placeholder: ${t.value}]`
          : t.type === "gap"
            ? "[…]"
            : t.value,
      )
      .join("");
    return SKIP;
  });
}

export function mdxToMarkdown(source: string, ctx: MarkdownContext): string {
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkMdx)
    .use(remarkGfm)
    .parse(source) as Root;
  replacePlaceholders(tree);
  tree.children = transform(tree.children, ctx) as Root["children"];
  return (
    unified()
      .use(remarkGfm)
      .use(remarkStringify, { bullet: "-", emphasis: "_", rule: "-" })
      .stringify(tree)
      .trim()
      // remark-stringify escapes "[" defensively; these bracketed notes are never links.
      .replace(/\\\[([^\]\n]*)\](?![([:])/g, "[$1]")
  );
}

export interface CaseStudyMeta {
  title: string;
  lead: string;
  outcome: string;
  date: Date;
  locked: boolean;
  keyFacts: { role: string; client: string; team: string; status: string };
}

/** Full Markdown document for a case study. The body is only included when allowed. */
export function caseStudyMarkdown(
  meta: CaseStudyMeta,
  body: string | undefined,
  options: { url: string; ctx: MarkdownContext },
): string {
  const facts = [
    `- Role: ${meta.keyFacts.role}`,
    `- Client: ${meta.keyFacts.client}`,
    `- Team: ${meta.keyFacts.team}`,
    `- Status: ${meta.keyFacts.status}`,
    `- Date: ${meta.date.toISOString().slice(0, 7)}`,
    `- Outcome: ${meta.outcome}`,
    `- Web version: ${options.url}`,
  ].join("\n");
  const head = `# ${meta.title}\n\n> ${meta.lead}\n\n${facts}`;
  if (meta.locked && !options.ctx.unlocked) {
    return `${head}\n\n🔒 This case study is password protected. Title, summary and key facts are public; the full case study requires the password from the application.\n`;
  }
  return `${head}\n\n${mdxToMarkdown(body ?? "", options.ctx)}\n`;
}

export function markdownResponse(
  markdown: string,
  init: { private?: boolean; status?: number } = {},
): Response {
  return new Response(markdown, {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": init.private ? "private, no-store" : "public, max-age=0, must-revalidate",
      Vary: "Accept",
    },
  });
}
