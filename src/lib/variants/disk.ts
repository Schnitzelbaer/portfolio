import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { type VariantConfig, variantSchema } from "./schema";
import { validateVariant } from "./validate";

/** Loads and validates all variants from `content/variants/` (for build scripts outside Astro). */
export function loadVariantsFromDisk(root: string): Array<VariantConfig & { id: string }> {
  const dir = join(root, "content", "variants");
  const workDir = join(root, "content", "work");
  const slugs = existsSync(workDir)
    ? readdirSync(workDir).filter((name) => existsSync(join(workDir, name, "index.mdx")))
    : [];
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((name) => {
      const id = name.replace(/\.ya?ml$/, "");
      const result = variantSchema.safeParse(parse(readFileSync(join(dir, name), "utf8")));
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `  ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        throw new Error(`content/variants/${name} is invalid:\n${issues}`);
      }
      const problems = validateVariant(id, result.data, slugs);
      if (problems.length) throw new Error(`content/variants/${name}:\n  ${problems.join("\n  ")}`);
      return { id, ...result.data };
    });
}
