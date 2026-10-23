# Portfolio

UX/UI portfolio of Simon Wirth: Astro on Vercel, content in Markdown/MDX, static wherever possible.
Conventions and all commands: [CLAUDE.md](CLAUDE.md). Decisions: [docs/decisions/](docs/decisions/).

## Setup

```sh
npm install
cp .env.example .env
npm run dev        # http://portfolio.localhost:4321, password for protected work: "preview"
```

Variants run locally at `http://<id>.portfolio.localhost:4321` (no setup needed; `*.localhost` resolves to your machine).

## Add a case study

1. Write it in Notion. Start with the title, then a block of properties (`Lead:`, `Date:`, `Role:`, `Client:`, `Team:`, `Status:`, `Outcome:`, `Order:`, `Locked: Yes/No`, `Cover:`). Use callouts that start with "Decision:", "Achieved" or "Expected", a 🔒 callout for protected parts, toggles (a toggle named "Reflection" becomes the reflection list), and `[Screen: …]` / `[...]` for anything still missing.
2. Export the page as **Markdown & CSV** (subpages off).
3. Run `npm run import:notion -- ~/Downloads/Export.zip --slug my-case` and read the warnings it prints.
4. Open `content/work/my-case/index.mdx`, fix what the warnings list, and check the page in `npm run dev`. Open placeholders are highlighted in orange.
5. Run `npm run check:drafts` until nothing blocks, then commit and push.

## Add an application variant

1. Run `npm run variant:new -- acme --company "Acme AG" --intro "Hello Acme team, …"`.
2. Edit `content/variants/acme.yaml`: keep, remove or reorder the case study slugs.
3. Check it at `http://acme.portfolio.localhost:4321` and run `npm run check:drafts -- acme` (a production build fails while the variant's case studies contain placeholders).
4. If your DNS has no wildcard (see below), add `acme.<domain>` as a domain in the Vercel project and the matching CNAME at Hostpoint.
5. Commit and push. The variant is live at `https://acme.<domain>`: not indexed, not in the sitemap, not linked from the main site.

## What else is in here

- **Showcases:** code-based tours with cursor, captions and a timeline, see [showcases/README.md](showcases/README.md).
- **Password protection:** one password for all locked work, checked on the server. Locked text, images and showcase code are never part of the public build. Set it with `npm run password:hash`.
- **Agent version:** every page as Markdown (`.md` URLs, `Accept: text/markdown`, known AI crawlers), `llms.txt`, and the "For agents" switch. Locked content stays locked there too.
- **Tests:** `npm test` (unit), `npm run test:e2e` (production build: leak tests, unlock flow, variants, agents, tours, axe).

## Deploy (Vercel + Hostpoint)

**Vercel project**

1. Import the GitHub repository in Vercel. Framework preset: Astro. Build command `npm run build` (default). Node.js 22.
2. Environment variables (Production, and Preview if you want to test the gate there):
   - `SITE_DOMAIN` = your domain, e.g. `simonwirth.ch` (Production only; previews use their own URL).
   - `LOCK_PASSWORD_HASH` and `LOCK_COOKIE_SECRET` from `npm run password:hash`. Without them nothing can be unlocked.
3. Optional: enable Web Analytics in the project, then set `analytics: true` in `content/site.yaml`.

**DNS at Hostpoint** (choose one)

- **Recommended: Vercel nameservers.** In the Hostpoint control panel set the nameservers to the ones Vercel shows (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). In Vercel add `<domain>`, `www.<domain>` and `*.<domain>`. Every new variant then works without DNS changes. Re-create any mail records (MX, SPF, DKIM) in Vercel DNS first if the domain receives email.
- **Keep Hostpoint DNS.** In Vercel add `<domain>` and `www.<domain>`, then create exactly the records Vercel shows (an A record for the apex, a CNAME for `www`). Wildcard certificates need Vercel nameservers, so add every variant subdomain separately: domain in Vercel plus CNAME at Hostpoint.

**After every deploy**

```sh
npm run smoke -- https://<domain> --production --variant https://acme.<domain>
```

The smoke test checks what only a real Vercel deployment can prove (routing rules, negotiation, the gate) and warms the CDN for images on protected pages.
