import Callout from "./Callout.astro";
import Column from "./Column.astro";
import Columns from "./Columns.astro";
import Compare from "./Compare.astro";
import Decision from "./Decision.astro";
import Figure from "./Figure.astro";
import FigureGroup from "./FigureGroup.astro";
import Gap from "./Gap.astro";
import Locked from "./Locked.astro";
import type { BlockName } from "./names";
import Outcome from "./Outcome.astro";
import Placeholder from "./Placeholder.astro";
import Quote from "./Quote.astro";
import Reflection from "./Reflection.astro";
import Toggle from "./Toggle.astro";
import Variant from "./Variant.astro";
import Video from "./Video.astro";

/**
 * Every component that case studies may use in MDX, by tag name.
 * Pass to `<Content components={blocks} />`. Each block also needs a Markdown serializer in
 * `src/lib/agent/markdown.ts`; `satisfies` makes the type checker enforce both lists.
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
  Toggle,
  Variant,
  Video,
} satisfies Record<BlockName, unknown>;
