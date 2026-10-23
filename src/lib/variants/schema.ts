import { z } from "astro/zod";

/** Subdomain-safe id: lowercase letters, digits and hyphens. */
export const VARIANT_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Ids that must never become application subdomains. */
export const RESERVED_VARIANT_IDS = ["www", "api", "app", "mail", "admin", "preview"];

export const variantSchema = z.object({
  company: z.string({ error: "company is required (shown in the page title and OG image)" }).min(1),
  projects: z
    .array(z.string().min(1), { error: "projects must be a list of case study slugs" })
    .min(1, { error: "projects needs at least one case study slug" }),
  intro: z.string().optional(),
  analytics: z.boolean().default(true),
  indexable: z.boolean().default(false),
});

export type VariantConfig = z.infer<typeof variantSchema>;
