import { RESERVED_VARIANT_IDS, VARIANT_ID, type VariantConfig } from "./schema";

/** Checks what the schema cannot: the id (file name) and that every project exists. */
export function validateVariant(id: string, config: VariantConfig, slugs: string[]): string[] {
  const problems: string[] = [];
  if (!VARIANT_ID.test(id)) {
    problems.push(`"${id}" is not a valid subdomain. Use lowercase letters, digits and hyphens.`);
  }
  if (RESERVED_VARIANT_IDS.includes(id))
    problems.push(`"${id}" is reserved. Choose another file name.`);
  for (const project of config.projects) {
    if (!slugs.includes(project)) {
      problems.push(`projects: "${project}" is not a case study. Known: ${slugs.join(", ")}`);
    }
  }
  if (new Set(config.projects).size !== config.projects.length)
    problems.push("projects: contains duplicates");
  return problems;
}
