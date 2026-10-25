import { SITE_DOMAIN } from "astro:env/server";
import { originFor } from "./origin";
import { site } from "./site";
import type { Variant } from "./variants";
import { getVariantWork } from "./variants";
import { getWork, hasLockedSection, type WorkEntry } from "./work";

/** What a page needs to know about where it is served: main site or an application variant. */
export interface PageContext {
  variant: Variant | undefined;
  origin: string;
  noindex: boolean;
  analytics: boolean;
}

export function pageContext(variant?: Variant): PageContext {
  return {
    variant,
    origin: originFor(SITE_DOMAIN, variant?.id),
    noindex: variant ? !variant.indexable : false,
    analytics: site.analytics && (variant?.analytics ?? true),
  };
}

/** Case studies visible in this context, in display order. */
export async function workFor(variant: Variant | undefined): Promise<WorkEntry[]> {
  return variant ? getVariantWork(variant) : getWork();
}

/** True when the page needs the server-side gate (locked entry or a locked section). */
export function isGated(entry: WorkEntry): boolean {
  return entry.data.locked || hasLockedSection(entry);
}
