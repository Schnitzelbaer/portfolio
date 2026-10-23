import { isGated, nextIn, type PageContext, pageContext, workFor } from "./page";
import { getVariant } from "./variants";
import type { WorkEntry } from "./work";

export interface GatedPage {
  entry: WorkEntry;
  next: WorkEntry | undefined;
  context: PageContext;
  /** The request asked for `/work/<slug>.md`. */
  markdownPath: boolean;
}

/**
 * Resolves an on-demand case study request (`/work/<slug>` or `/work/<slug>.md`). Returns
 * undefined (→ 404) for unknown slugs, slugs outside the variant's selection, and public pages
 * (those are static files).
 */
export async function resolveGatedPage(
  path: string | undefined,
  variantId: string | undefined,
): Promise<GatedPage | undefined> {
  const markdownPath = Boolean(path?.endsWith(".md"));
  const slug = markdownPath ? path?.slice(0, -3) : path;
  const variant = await getVariant(variantId);
  if (variantId && !variant) return undefined;
  const list = await workFor(variant);
  const entry = list.find((e) => e.id === slug);
  if (!entry || !isGated(entry)) return undefined;
  return { entry, next: nextIn(list, entry), context: pageContext(variant), markdownPath };
}
