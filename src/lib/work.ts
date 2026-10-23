import { type CollectionEntry, getCollection } from "astro:content";

export type WorkEntry = CollectionEntry<"work">;

/** All case studies in display order. */
export async function getWork(): Promise<WorkEntry[]> {
  const entries = await getCollection("work");
  return entries.sort(
    (a, b) => a.data.order - b.data.order || b.data.date.getTime() - a.data.date.getTime(),
  );
}

/** True when the body contains a `<Locked>` section (the page then needs the server-side gate). */
export function hasLockedSection(entry: WorkEntry): boolean {
  return /<Locked[\s>]/.test(entry.body ?? "");
}
