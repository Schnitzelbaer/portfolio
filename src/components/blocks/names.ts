/** Every block component case studies may use in MDX. Kept in sync with `registry.ts` and the
 * Markdown serializers by the type checker (`satisfies Record<BlockName, …>`) and a unit test. */
export const BLOCK_NAMES = [
  "Callout",
  "Column",
  "Columns",
  "Compare",
  "Decision",
  "Figure",
  "FigureGroup",
  "Gap",
  "Locked",
  "Outcome",
  "Placeholder",
  "Quote",
  "Reflection",
  "Stat",
  "Stats",
  "Toggle",
  "Variant",
  "Video",
] as const;

export type BlockName = (typeof BLOCK_NAMES)[number];
