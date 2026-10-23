# 001: Stack

- Status: accepted
- Date: 2026-10-23

## Context

The portfolio is itself a work sample. Recruiters open it on their phones and spend two to five minutes on it, so performance (Lighthouse ≥ 95 mobile, LCP < 2 s), accessibility (WCAG AA) and polish matter as much as the content.

Constraints from the brief:

- Hosting on Vercel; the domain stays at Hostpoint, only DNS changes.
- Server-side password protection and host-based routing for application subdomains are required.
- Static wherever possible, few dependencies, content strictly separated from code.
- Case studies are written in Notion and imported as Markdown/MDX with validated frontmatter.

## Decision

**Astro 7 with `@astrojs/mdx` and `@astrojs/vercel`.** Static output by default; only the password gate renders on demand.

- **Markdown pipeline:** `unified()` from `@astrojs/markdown-remark` instead of Astro 7's default Sätteri processor. The remark ecosystem lets us transform MDX at compile time (placeholders, private images) and reuse the same syntax tree for the Notion import and the agent version.
- **Content:** Content Collections with Zod schemas in `src/content.config.ts`, files in the top-level `content/` folder.
- **Images:** `astro:assets` (AVIF/WebP, responsive `srcset`). Images in locked content are rewritten at compile time to opaque ids, so they are never imported into the public build; a gated endpoint serves them after unlock.
- **Request-time logic:** The Vercel adapter (v11, verified in its source) only runs Astro middleware for on-demand routes, even in `middlewareMode: "edge"`. Prerendered pages get no request-time code. Therefore:
  1. Public pages, variant pages (prerendered under `/v/<id>/`), Markdown versions, `llms.txt`, OG images and the sitemap are static.
  2. A declarative routing table (`src/lib/routing/`) describes host → variant rewrites, content negotiation (`Accept: text/markdown`) and headers. A post-build step writes it into `.vercel/output/config.json` (Build Output API). The dev server and the local e2e preview server interpret the same table.
  3. Only locked case studies, pages with locked sections, their Markdown versions, `/api/unlock` and `/_private/*` render on demand, with `Cache-Control: private, no-store`.
- **Tooling:** TypeScript (strict), `astro check`, Biome (lint and format for TS/JS/JSON/CSS), Vitest, Playwright with the preinstalled Chromium, tsx for scripts.

## Alternatives considered

- **Next.js (App Router):** Middleware runs in front of every request, which makes password protection and host routing straightforward. But it ships more client JavaScript by default, needs more care to stay static and brings a much larger dependency tree.
- **Eleventy + Vercel Functions:** Very lean and fully static. MDX components, a responsive image pipeline and typed content validation would all have to be assembled by hand.
- **SvelteKit:** Strong static and server story, but MDX support (mdsvex) is weaker and the Notion → component mapping would be less direct.

## Consequences

- The Vercel routing rules can only be emulated locally. Before going live, run the smoke test (`npm run smoke -- <preview-url>`) against a Vercel preview deployment; the deploy checklist in the README covers this.
- Leaks are prevented at compile time (locked content never enters static output) and checked twice: a scan of the build output and e2e tests against the preview server.
- Coupling to Vercel's Build Output API is intentional; switching hosts means rewriting one serializer.

## Addendum (phase d)

- Astro ignores page folders that start with `_`, so variant pages live under `/v/<id>/`. In production `/v/*` answers 404 on every host; variants are only reachable through their subdomain.
- Vercel functions receive the original request URL, not the rewritten one. On-demand routes therefore sit at the public paths (`src/pages/work/[...gated].astro`) and read the variant from the Host header. A twin route under `/v/[variant]/work/` exists so Vercel's routing sends rewritten misses to the function.
- Case studies with a `<Locked>` section render on demand (like locked case studies), so the unlocked section can be rendered on the server. This trades a function call for not shipping locked content in any form, encrypted or not.
