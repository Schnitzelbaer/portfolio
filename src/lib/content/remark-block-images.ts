import type { Image, Paragraph, Root } from "mdast";
import { visitParents } from "unist-util-visit-parents";
import type { VFile } from "vfile";
import {
  esmImport,
  expressionAttr,
  getStringAttr,
  isJsxElement,
  type JsxElement,
  jsxFlow,
  jsxText,
  removeAttr,
  setAttr,
  stringAttr,
} from "./mdast-jsx";
import { entrySlugFromPath, isRelativeAsset, privateImageId } from "./private-images";

/** Block components and the attributes that hold a local image path. */
export const IMAGE_ATTRIBUTES: Record<string, string[]> = {
  Figure: ["src"],
  Variant: ["src"],
};

/** The component whose children must stay behind the password gate. */
export const LOCKED_COMPONENT = "Locked";

interface AstroFileData {
  astro?: { frontmatter?: Record<string, unknown> };
}

/**
 * Resolves local image paths in block components.
 *
 * Public context: the path becomes a static import, so Astro optimizes it.
 * Locked context (entry with `locked: true`, or inside `<Locked>`): the path is replaced by an
 * opaque `privateId` and never imported. This keeps locked images out of the public build output
 * by construction; they are served later by the gated `/_private` endpoint.
 *
 * Plain Markdown images are normalized to `<Figure>` first so the same rules apply to them.
 */
export function remarkBlockImages() {
  return (tree: Root, file: VFile) => {
    const slug = entrySlugFromPath(file.path ?? "");
    if (!slug) return;
    const frontmatter = (file.data as AstroFileData).astro?.frontmatter ?? {};
    const entryLocked = frontmatter.locked === true;

    normalizeMarkdownImages(tree);

    const imports: string[] = [];
    const known = new Map<string, string>();

    visitParents(tree, (node, ancestors) => {
      if (!isJsxElement(node)) return;
      const attributes = node.name ? IMAGE_ATTRIBUTES[node.name] : undefined;
      if (!attributes) return;
      const locked =
        entryLocked || ancestors.some((a) => isJsxElement(a) && a.name === LOCKED_COMPONENT);

      for (const name of attributes) {
        const src = getStringAttr(node, name);
        if (!isRelativeAsset(src)) continue;
        if (locked) {
          removeAttr(node, name);
          setAttr(node, stringAttr("privateId", privateImageId(slug, src)));
          continue;
        }
        let identifier = known.get(src);
        if (!identifier) {
          identifier = `__blockImage${known.size}`;
          known.set(src, identifier);
          imports.push(`import ${identifier} from ${JSON.stringify(src)};`);
        }
        setAttr(node, expressionAttr(name, identifier));
      }
    });

    if (imports.length) tree.children.unshift(esmImport(imports.join("\n")));
  };
}

/** `![alt](./x.png "Caption")` → `<Figure src="./x.png" alt="alt" caption="Caption" />`. */
function normalizeMarkdownImages(tree: Root) {
  const toFigure = (image: Image, inline: boolean): JsxElement => {
    const attributes = [stringAttr("src", image.url), stringAttr("alt", image.alt ?? "")];
    if (image.title) attributes.push(stringAttr("caption", image.title));
    return inline ? jsxText("Figure", attributes) : jsxFlow("Figure", attributes);
  };

  visitParents(tree, "image", (image: Image, ancestors) => {
    if (!isRelativeAsset(image.url)) return;
    const parent = ancestors.at(-1);
    const grandparent = ancestors.at(-2);
    if (!parent || !("children" in parent)) return;
    const siblings = parent.children as unknown[];
    const onlyChild = parent.type === "paragraph" && siblings.length === 1;
    if (onlyChild && grandparent && "children" in grandparent) {
      const list = grandparent.children as unknown[];
      list[list.indexOf(parent as Paragraph)] = toFigure(image, false);
    } else {
      siblings[siblings.indexOf(image)] = toFigure(image, true);
    }
  });
}
