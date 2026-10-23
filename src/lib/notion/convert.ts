import type { BlockContent, Image, Paragraph, PhrasingContent, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { stringify as toYaml } from "yaml";

/**
 * Converts a Notion Markdown export into case study MDX.
 *
 * Mapping (first line of a callout decides):
 * - callout starting with "Decision:"   → <Decision title="…">
 * - callout starting with "Achieved" / "Expected" → <Outcome type="…">
 * - callout with 🔒 or starting with "Locked" → <Locked>
 * - any other callout                    → <Callout icon="…">
 * - toggle with summary "Reflection"     → <Reflection>
 * - any other toggle                     → <Toggle summary="…">
 * - images                               → copied to ./images/, become <Figure>s in the build
 * `[Screen: …]` and `[...]` stay as they are; the content pipeline turns them into placeholders.
 */

export interface NotionImage {
  /** Path as written in the export, URL-decoded and relative to the Markdown file. */
  source: string;
  /** Target file name inside the case study's `images/` folder. */
  target: string;
}

export interface ConvertResult {
  mdx: string;
  frontmatter: Record<string, unknown>;
  images: NotionImage[];
  warnings: string[];
}

const PROPERTY_KEYS: Record<string, string> = {
  lead: "lead",
  date: "date",
  author: "author",
  locked: "locked",
  outcome: "outcome",
  order: "order",
  role: "role",
  client: "client",
  team: "team",
  status: "status",
  cover: "cover",
  "cover alt": "coverAlt",
  coveralt: "coverAlt",
};

const OPEN = "[...]";
const EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

interface ExtractedBlock {
  kind: "aside" | "details";
  summary?: string;
  inner: string;
}

/**
 * Replaces `<aside>` and `<details>` HTML blocks with marker paragraphs before Markdown parsing,
 * innermost first, so nested toggles and callouts survive.
 */
function extractHtmlBlocks(markdown: string): { text: string; blocks: ExtractedBlock[] } {
  const blocks: ExtractedBlock[] = [];
  const marker = (i: number) => `\n\nNOTIONBLOCK${i}END\n\n`;
  let text = markdown;
  const innermostDetails =
    /<details>\s*<summary>([\s\S]*?)<\/summary>((?:(?!<details>)[\s\S])*?)<\/details>/;
  const innermostAside = /<aside>((?:(?!<aside>)[\s\S])*?)<\/aside>/;
  for (;;) {
    const details = innermostDetails.exec(text);
    const aside = innermostAside.exec(text);
    const next = [details, aside]
      .filter((m): m is RegExpExecArray => m !== null)
      .sort((a, b) => a[0].length - b[0].length)[0];
    if (!next) break;
    const index = blocks.length;
    if (next === details) {
      blocks.push({
        kind: "details",
        summary: stripTags(next[1] ?? "").trim(),
        inner: next[2] ?? "",
      });
    } else {
      blocks.push({ kind: "aside", inner: next[1] ?? "" });
    }
    text = text.slice(0, next.index) + marker(index) + text.slice(next.index + next[0].length);
  }
  return { text, blocks };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function attr(name: string, value: string): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

function jsx(
  name: string,
  attributes: MdxJsxAttribute[],
  children: RootContent[],
): MdxJsxFlowElement {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes,
    children: children as MdxJsxFlowElement["children"],
  };
}

function plainText(nodes: PhrasingContent[]): string {
  return nodes
    .map((n) =>
      "value" in n ? n.value : "children" in n ? plainText(n.children as PhrasingContent[]) : "",
    )
    .join("");
}

/** Removes `prefix` (case-insensitive) from the start of a paragraph, including inside bold text. */
function stripLeadingText(paragraph: Paragraph, pattern: RegExp): void {
  const first = paragraph.children[0];
  if (!first) return;
  if (first.type === "text") first.value = first.value.replace(pattern, "");
  else if (
    (first.type === "strong" || first.type === "emphasis") &&
    first.children[0]?.type === "text"
  ) {
    first.children[0].value = first.children[0].value.replace(pattern, "");
    if (!plainText(first.children).trim()) paragraph.children.shift();
  }
  const head = paragraph.children[0];
  if (head?.type === "text") head.value = head.value.replace(/^\s+/, "");
}

function convertAside(block: ExtractedBlock, build: (md: string) => RootContent[]): RootContent {
  const inner = block.inner.replace(/<img[^>]*\/?>/g, "").trim();
  const iconMatch = EMOJI.exec(inner);
  const icon = iconMatch?.[1];
  const body = build(iconMatch ? inner.slice(iconMatch[0].length) : inner);
  const first = body[0]?.type === "paragraph" ? (body[0] as Paragraph) : undefined;
  const firstText = first ? plainText(first.children).trim() : "";

  const decision = /^Decision:\s*/i;
  if (first && decision.test(firstText)) {
    const lines = firstText.replace(decision, "").split("\n");
    const title = (lines[0] ?? "").trim();
    const rest = lines.slice(1).join("\n").trim();
    const children = [...(rest ? build(rest) : []), ...body.slice(1)];
    return jsx("Decision", [attr("title", title)], children);
  }
  const outcome = /^(Achieved|Expected)\b:?\s*/i.exec(firstText);
  if (first && outcome) {
    stripLeadingText(first, /^(Achieved|Expected)\b:?\s*/i);
    const children = plainText(first.children).trim() ? body : body.slice(1);
    return jsx("Outcome", [attr("type", (outcome[1] ?? "").toLowerCase())], children);
  }
  if (icon === "🔒" || /^Locked\b/i.test(firstText)) {
    if (first && /^Locked\b/i.test(firstText)) stripLeadingText(first, /^Locked\b:?\s*/i);
    const children = first && !plainText(first.children).trim() ? body.slice(1) : body;
    return jsx("Locked", [], children);
  }
  return jsx("Callout", icon ? [attr("icon", icon)] : [], body);
}

function convertDetails(block: ExtractedBlock, build: (md: string) => RootContent[]): RootContent {
  const summary = block.summary ?? "";
  const children = build(block.inner.trim());
  if (/^reflection$/i.test(summary)) return jsx("Reflection", [], children);
  return jsx("Toggle", [attr("summary", summary)], children);
}

function parseProperties(paragraph: Paragraph | undefined): Record<string, string> | undefined {
  if (!paragraph) return undefined;
  const lines = plainText(paragraph.children).split("\n");
  const props: Record<string, string> = {};
  for (const line of lines) {
    const match = /^([A-Za-z][\w ]{0,30}):\s*(.*)$/.exec(line.trim());
    if (!match) return undefined;
    props[(match[1] ?? "").trim().toLowerCase()] = (match[2] ?? "").trim();
  }
  return props;
}

function imageTarget(source: string, used: Set<string>): string {
  const file = source.split("/").pop() ?? "image";
  const dot = file.lastIndexOf(".");
  const ext = dot > 0 ? file.slice(dot).toLowerCase() : ".png";
  const stem = slugify(dot > 0 ? file.slice(0, dot) : file) || "image";
  let name = `${stem}${ext}`;
  for (let i = 2; used.has(name); i++) name = `${stem}-${i}${ext}`;
  used.add(name);
  return name;
}

export function convertNotionMarkdown(
  markdown: string,
  options: { author?: string } = {},
): ConvertResult {
  const warnings: string[] = [];
  const { text, blocks } = extractHtmlBlocks(markdown.replace(/\r\n/g, "\n"));

  const build = (md: string): RootContent[] => {
    const tree = parseMarkdown(md);
    return tree.children.flatMap((node): RootContent[] => {
      const marker =
        node.type === "paragraph"
          ? /^NOTIONBLOCK(\d+)END$/.exec(plainText(node.children).trim())
          : null;
      const block = marker ? blocks[Number(marker[1])] : undefined;
      if (!block) return [node];
      return [block.kind === "aside" ? convertAside(block, build) : convertDetails(block, build)];
    });
  };

  const children = build(text);

  // Title (first H1) and Notion properties (the "Key: Value" paragraph right after it).
  let title = "";
  const h1Index = children.findIndex((n) => n.type === "heading" && n.depth === 1);
  if (h1Index !== -1) {
    const h1 = children[h1Index];
    title = h1 && h1.type === "heading" ? plainText(h1.children).trim() : "";
    children.splice(h1Index, 1);
  } else {
    warnings.push("No title (H1) found.");
  }
  const maybeProps = children[h1Index === -1 ? 0 : h1Index];
  const props = parseProperties(maybeProps?.type === "paragraph" ? maybeProps : undefined) ?? {};
  if (Object.keys(props).length) children.splice(h1Index === -1 ? 0 : h1Index, 1);

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    const mapped = PROPERTY_KEYS[key];
    if (mapped) fields[mapped] = value;
    else warnings.push(`Ignored Notion property "${key}".`);
  }

  // Images: collect, rename and rewrite to ./images/<name>.
  const images: NotionImage[] = [];
  const used = new Set<string>();
  const root: Root = { type: "root", children };
  visit(root, "image", (node: Image) => {
    if (/^https?:/.test(node.url)) {
      warnings.push(`Remote image kept as link: ${node.url}`);
      return;
    }
    const source = decodeURIComponent(node.url);
    const existing = images.find((i) => i.source === source);
    const target = existing?.target ?? imageTarget(source, used);
    if (!existing) images.push({ source, target });
    node.url = `./images/${target}`;
    if (!node.alt?.trim())
      warnings.push(
        `Image without alt text: ${source}. Add a caption in Notion or alt text in the MDX.`,
      );
  });

  let cover: string | undefined;
  if (fields.cover) {
    const source = decodeURIComponent(fields.cover);
    let image = images.find((i) => i.source === source || i.source.endsWith(`/${source}`));
    if (!image) {
      image = { source, target: imageTarget(source, used) };
      images.push(image);
    }
    cover = `./images/${image.target}`;
  } else if (images[0]) {
    cover = `./images/${images[0].target}`;
    warnings.push(`No "Cover" property; using the first image (${images[0].target}) as cover.`);
  }

  const bool = (v: string | undefined) => /^(yes|true|ja|x|✓|☑|1)$/i.test((v ?? "").trim());
  const required = (key: string, value: string | undefined) => {
    if (value?.trim()) return value.trim();
    warnings.push(`Missing "${key}"; wrote [...] so the draft check flags it.`);
    return OPEN;
  };
  const date =
    fields.date && !Number.isNaN(Date.parse(fields.date))
      ? new Date(fields.date).toISOString().slice(0, 10)
      : undefined;

  const frontmatter: Record<string, unknown> = {
    title: required("title", title),
    lead: required("lead", fields.lead),
    date: date ?? new Date().toISOString().slice(0, 10),
    author: fields.author || options.author || OPEN,
    cover: cover ?? required("cover", undefined),
    coverAlt: required("coverAlt", fields.coverAlt),
    locked: bool(fields.locked),
    outcome: required("outcome", fields.outcome),
    order: Number.parseInt(fields.order ?? "", 10) || 99,
    keyFacts: {
      role: required("role", fields.role),
      client: required("client", fields.client),
      team: required("team", fields.team),
      status: required("status", fields.status),
    },
  };
  if (!date) warnings.push('Missing or invalid "date"; used today.');

  const body = unified()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkFrontmatter)
    .use(remarkStringify, { bullet: "-", emphasis: "_", rule: "-" })
    .stringify(root as Root & { children: (BlockContent | RootContent)[] });

  // remark-stringify escapes "[" defensively; placeholders are safe in MDX, keep them readable.
  const readable = body.replace(/\\\[(Screen:[^\]\n]*|\.\.\.|…)\]/g, "[$1]");

  // YAML would quote "[...]" itself; keep the marker visible for the draft check.
  const yaml = toYaml(frontmatter, { lineWidth: 0 }).replace(/'\[\.\.\.\]'/g, '"[...]"');
  return { mdx: `---\n${yaml}---\n\n${readable}`, frontmatter, images, warnings };
}
