import { isGated, nextIn, type PageContext, pageContext, workFor } from "./page";
import { getVariant } from "./variants";
import type { WorkEntry } from "./work";

export interface GatedPage {
  entry: WorkEntry;
  next: WorkEntry | undefined;
  context: PageContext;
}

/**
 * Resolves an on-demand case study request. Returns undefined (→ 404) for unknown slugs,
 * slugs outside the variant's selection, and public pages (those are static files).
 */
export async function resolveGatedPage(
  slug: string | undefined,
  variantId: string | undefined,
): Promise<GatedPage | undefined> {
  const variant = await getVariant(variantId);
  if (variantId && !variant) return undefined;
  const list = await workFor(variant);
  const entry = list.find((e) => e.id === slug);
  if (!entry || !isGated(entry)) return undefined;
  return { entry, next: nextIn(list, entry), context: pageContext(variant) };
}
