import type { Paragraph, PhrasingContent, Root, Text } from "mdast";
import { SKIP, visit } from "unist-util-visit";
import { expressionAttr, jsxFlow, jsxText, stringAttr } from "./mdast-jsx";
import { SCREEN_PATTERN, tokenizePlaceholders } from "./placeholders";

/**
 * Turns the Notion placeholder convention into components:
 * a paragraph that is only `[Screen: …]` becomes a block `<Placeholder>`,
 * inline `[Screen: …]` and `[...]` become inline `<Placeholder>` / `<Gap>`.
 */
export function remarkPlaceholders() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      const only = node.children.length === 1 ? node.children[0] : undefined;
      if (only?.type === "text") {
        const match = new RegExp(`^\\s*${SCREEN_PATTERN.source}\\s*$`).exec(only.value);
        if (match) {
          parent.children[index] = jsxFlow("Placeholder", [stringAttr("label", match[1] ?? "")]);
          return SKIP;
        }
      }
    });

    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const tokens = tokenizePlaceholders(node.value);
      if (tokens.length === 1 && tokens[0]?.type === "text") return;
      const replacement: PhrasingContent[] = tokens.map((token) => {
        if (token.type === "text") return { type: "text", value: token.value };
        if (token.type === "screen")
          return jsxText("Placeholder", [
            stringAttr("label", token.value),
            expressionAttr("inline", "true"),
          ]);
        return jsxText("Gap");
      });
      (parent.children as PhrasingContent[]).splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    });
  };
}
