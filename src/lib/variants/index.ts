import { getCollection } from "astro:content";
import { getWork, type WorkEntry } from "../work";
import type { VariantConfig } from "./schema";
import { validateVariant } from "./validate";

export type Variant = VariantConfig & { id: string };

/** All application variants, validated against the existing case studies. */
export async function getVariants(): Promise<Variant[]> {
  const [entries, work] = await Promise.all([getCollection("variants"), getWork()]);
  const slugs = work.map((w) => w.id);
  return entries.map((entry) => {
    const problems = validateVariant(entry.id, entry.data, slugs);
    if (problems.length)
      throw new Error(`content/variants/${entry.id}.yaml:\n  ${problems.join("\n  ")}`);
    return { id: entry.id, ...entry.data };
  });
}

export async function getVariant(id: string | undefined): Promise<Variant | undefined> {
  if (!id) return undefined;
  return (await getVariants()).find((v) => v.id === id);
}

/** The variant's case studies, in the order of its config. */
export async function getVariantWork(variant: Variant): Promise<WorkEntry[]> {
  const work = await getWork();
  return variant.projects.flatMap((slug) => work.filter((w) => w.id === slug));
}
