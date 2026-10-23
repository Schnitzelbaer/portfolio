import { z } from "astro/zod";
import { parse } from "yaml";
import raw from "../../content/site.yaml?raw";

const siteSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  timezone: z.string().min(1),
  email: z.email(),
  links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
  work: z.object({ label: z.string(), intro: z.string().min(1) }),
  analytics: z.boolean().default(false),
  agents: z.object({ userAgents: z.array(z.string()).default([]) }).default({ userAgents: [] }),
});

export type Site = z.infer<typeof siteSchema>;

function load(): Site {
  const result = siteSchema.safeParse(parse(raw));
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`content/site.yaml is invalid:\n${issues}`);
  }
  return result.data;
}

export const site: Site = load();
