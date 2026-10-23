import { parse } from "acorn";
import type { RootContent } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import type { MdxjsEsm } from "mdast-util-mdxjs-esm";

export type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

export function isJsxElement(node: { type: string }): node is JsxElement {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

function program(code: string) {
  // biome-ignore lint/suspicious/noExplicitAny: acorn and estree types differ slightly but are runtime compatible
  const tree = parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any;
  return { ...tree, type: "Program", sourceType: "module" };
}

export function stringAttr(name: string, value: string): MdxJsxAttribute {
  return { type: "mdxJsxAttribute", name, value };
}

export function expressionAttr(name: string, code: string): MdxJsxAttribute {
  return {
    type: "mdxJsxAttribute",
    name,
    value: { type: "mdxJsxAttributeValueExpression", value: code, data: { estree: program(code) } },
  };
}

export function esmImport(code: string): MdxjsEsm {
  return { type: "mdxjsEsm", value: code, data: { estree: program(code) } };
}

export function jsxFlow(
  name: string,
  attributes: MdxJsxAttribute[] = [],
  children: MdxJsxFlowElement["children"] = [],
): MdxJsxFlowElement {
  return { type: "mdxJsxFlowElement", name, attributes, children };
}

export function jsxText(
  name: string,
  attributes: MdxJsxAttribute[] = [],
  children: MdxJsxTextElement["children"] = [],
): MdxJsxTextElement {
  return { type: "mdxJsxTextElement", name, attributes, children };
}

function isPlainAttr(a: MdxJsxAttribute | MdxJsxExpressionAttribute): a is MdxJsxAttribute {
  return a.type === "mdxJsxAttribute";
}

/** Returns a string attribute value, or `undefined` when missing or given as an expression. */
export function getStringAttr(node: JsxElement, name: string): string | undefined {
  const attr = node.attributes.filter(isPlainAttr).find((a) => a.name === name);
  return typeof attr?.value === "string" ? attr.value : undefined;
}

export function setAttr(node: JsxElement, next: MdxJsxAttribute): void {
  const index = node.attributes.findIndex((a) => isPlainAttr(a) && a.name === next.name);
  if (index === -1) node.attributes.push(next);
  else node.attributes[index] = next;
}

export function removeAttr(node: JsxElement, name: string): void {
  node.attributes = node.attributes.filter((a) => !(isPlainAttr(a) && a.name === name));
}

export type { RootContent };
