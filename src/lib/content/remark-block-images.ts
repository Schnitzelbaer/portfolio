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
import {
  entrySlugFromPath,
  isRelativeAsset,
  privateImageId,
  privateMediaFile,
} from "./private-images";

/**
 * Block components and their attributes that hold a local file path.
 * `image`: optimized by astro:assets; in locked context replaced by `privateAttr`.
 * `media` (video): imported as a URL; in locked context replaced by a gated `/protected/media` URL.
 */
interface AssetAttribute {
  name: string;
  kind: "image" | "media";
  privateAttr?: string;
}

export const ASSET_ATTRIBUTES: Record<string, AssetAttribute[]> = {
  Figure: [{ name: "src", kind: "image", privateAttr: "privateId" }],
  Variant: [{ name: "src", kind: "image", privateAttr: "privateId" }],
  Video: [
    { name: "src", kind: "media" },
    { name: "webm", kind: "media" },
    { name: "mobileSrc", kind: "media" },
    { name: "mobileWebm", kind: "media" },
    { name: "poster", kind: "image", privateAttr: "posterPrivateId" },
    { name: "mobilePoster", kind: "image", privateAttr: "mobilePosterPrivateId" },
  ],
};

/** The component whose children must stay behind the password gate. */
export const LOCKED_COMPONENT = "Locked";

interface AstroFileData {
  astro?: { frontmatter?: Record<string, unknown> };
}

/**
 * Resolves local image and video paths in block components.
 *
 * Public context: the path becomes a static import, so Astro optimizes images and publishes videos.
 * Locked context (entry with `locked: true`, or inside `<Locked>`): images are replaced by an
 * opaque private id, videos by a gated `/protected/media/…` URL; neither is ever imported. This
 * keeps locked files out of the public build output by construction.
 *
 * Plain Markdown images are normalized to `<Figure>` first so the same rules apply to them.
 */
export interface BlockImagesOptions {
  /** Called for every image that stays private (used by `scripts/build-private.ts`). */
  onPrivateImage?: (image: { id: string; src: string; filePath: string }) => void;
  /** Called for every video that stays private (used by `scripts/build-private.ts`). */
  onPrivateMedia?: (media: { file: string; src: string; filePath: string }) => void;
}

export function remarkBlockImages(options: BlockImagesOptions = {}) {
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
      const attributes = node.name ? ASSET_ATTRIBUTES[node.name] : undefined;
      if (!attributes) return;
      const locked =
        entryLocked || ancestors.some((a) => isJsxElement(a) && a.name === LOCKED_COMPONENT);

      for (const { name, kind, privateAttr } of attributes) {
        const src = getStringAttr(node, name);
        if (!isRelativeAsset(src)) continue;
        if (locked && kind === "image") {
          const id = privateImageId(slug, src);
          removeAttr(node, name);
          setAttr(node, stringAttr(privateAttr ?? "privateId", id));
          options.onPrivateImage?.({ id, src, filePath: file.path });
          continue;
        }
        if (locked) {
          const mediaFile = privateMediaFile(slug, src);
          setAttr(node, stringAttr(name, `/protected/media/${mediaFile}`));
          options.onPrivateMedia?.({ file: mediaFile, src, filePath: file.path });
          continue;
        }
        let identifier = known.get(src);
        if (!identifier) {
          identifier = `__blockAsset${known.size}`;
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
