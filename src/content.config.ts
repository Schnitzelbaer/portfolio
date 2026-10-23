import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { variantSchema } from "./lib/variants/schema";

const required = (field: string, hint = "") => ({ error: `${field} is required${hint}` });

const work = defineCollection({
  loader: glob({
    pattern: "*/index.mdx",
    base: "./content/work",
    generateId: ({ entry }) => entry.split("/")[0] ?? entry,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(required("title")).min(1),
      lead: z.string(required("lead", " (one or two sentences under the title)")).min(1),
      date: z.coerce.date(required("date", " (YYYY-MM-DD)")),
      author: z.string(required("author")).min(1),
      cover: image(),
      coverAlt: z.string(required("coverAlt", " (describe the cover for screen readers)")),
      locked: z.boolean().default(false),
      outcome: z.string(required("outcome", " (one sentence for the project card)")).min(1),
      order: z.number(required("order", " (sort position on Work, lowest first)")).int(),
      keyFacts: z.object(
        {
          role: z.string(required("keyFacts.role")),
          client: z.string(required("keyFacts.client")),
          team: z.string(required("keyFacts.team")),
          status: z.string(required("keyFacts.status")),
        },
        required("keyFacts", " (role, client, team, status)"),
      ),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./content/pages" }),
  schema: z.object({
    title: z.string(required("title")),
    description: z.string(required("description")),
    tagline: z.string().optional(),
    tags: z.array(z.string()).default([]),
    experience: z
      .array(z.object({ company: z.string(), role: z.string(), from: z.string(), to: z.string() }))
      .default([]),
  }),
});

const variants = defineCollection({
  loader: glob({ pattern: "*.{yaml,yml}", base: "./content/variants" }),
  schema: variantSchema,
});

export const collections = { work, pages, variants };
