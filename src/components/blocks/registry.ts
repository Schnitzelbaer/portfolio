import Callout from "./Callout.astro";
import Column from "./Column.astro";
import Columns from "./Columns.astro";
import Compare from "./Compare.astro";
import Decision from "./Decision.astro";
import Figure from "./Figure.astro";
import FigureGroup from "./FigureGroup.astro";
import Gap from "./Gap.astro";
import Locked from "./Locked.astro";
import Outcome from "./Outcome.astro";
import Placeholder from "./Placeholder.astro";
import Quote from "./Quote.astro";
import Reflection from "./Reflection.astro";
import Showcase from "./Showcase.astro";
import Toggle from "./Toggle.astro";
import Variant from "./Variant.astro";

/**
 * Every component that case studies may use in MDX, by tag name.
 * Pass to `<Content components={blocks} />`. The agent version (phase f) adds a Markdown
 * serializer per entry; a unit test keeps both lists in sync.
 */
export const blocks = {
  Callout,
  Column,
  Columns,
  Compare,
  Decision,
  Figure,
  FigureGroup,
  Gap,
  Locked,
  Outcome,
  Placeholder,
  Quote,
  Reflection,
  Showcase,
  Toggle,
  Variant,
};

export type BlockName = keyof typeof blocks;
export const BLOCK_NAMES = Object.keys(blocks) as BlockName[];
