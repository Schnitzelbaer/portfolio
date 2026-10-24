# Portfolio: conventions

UX/UI portfolio for Simon Wirth, used for job applications. The site is itself a work sample: performance, accessibility and polish are part of the message. Stack and architecture: `docs/decisions/001-stack.md`.

## Language

- Site content, code, comments, commit messages: **English**.
- Conversation with Simon: German (Swiss spelling, never "ß").

## Commands

```sh
npm run dev            # http://portfolio.localhost:4321 (variants: <id>.portfolio.localhost:4321), password "preview"
npm run build          # private assets + Vercel build output in .vercel/output + routing table
npm run preview        # serve the build like Vercel: http://portfolio.localhost:4400
npm run check          # astro check + Biome
npm run format         # Biome autofix
npm test               # Vitest unit tests
npm run test:e2e       # production build + Playwright (leak tests, unlock, variants, videos, agents, axe)
npm run check:drafts   # list open [Screen: …] / [...] placeholders (optionally: -- <variant>)
npm run import:notion -- <export.zip|folder|page.md> [--slug name] [--force]
npm run variant:new -- <id> --company "Name" [--projects a,b] [--intro "…"]
npm run password:hash  # LOCK_PASSWORD_HASH + LOCK_COOKIE_SECRET for .env and Vercel
npm run smoke -- <url> [--production] [--variant <url>]   # check a deployment, warm image cache
npx lighthouse http://portfolio.localhost:4400/ --form-factor=mobile   # with npm run preview; CHROME_PATH=/opt/pw-browsers/chromium in cloud sessions
```

Run `npm run check` and `npm test` before every commit, `npm run test:e2e` before every push that touches routing, auth or content handling.

## Layout

- `content/`: all content, never code. `work/<slug>/index.mdx` (+ `images/`), `pages/*.mdx`, `variants/<id>.yaml`, `site.yaml`.
- `src/content.config.ts`: Zod schemas for all collections. Error messages must say what to fix.
- `src/components/blocks/`: MDX blocks. Every block is registered in `registry.ts`.
- `src/lib/content/`: remark plugins (placeholders, block images) and draft scanning.
- `src/lib/notion/`: Notion export → MDX conversion. `scripts/`: CLIs (thin wrappers around `src/lib`).
- Demos are pre-produced videos next to the case study (`content/work/<slug>/videos/`), embedded with the `<Video>` block (`src/components/blocks/Video.astro`, behaviour in `src/lib/video-demo.ts`). Provide WebM + MP4 and a poster, optionally a mobile variant.
- `src/lib/routing/`: routing table for subdomains and content negotiation (Vercel, dev, preview).
- `src/lib/auth/`: password hash and signed unlock cookie. `src/pages/protected/`: gated assets.
- `private/` (generated, gitignored): locked images and videos, only in the server function.
- `docs/decisions/`: short decision notes (ADR style). Add one for every non-obvious technical decision.

## Rules

- **Never leak locked content.** Locked entries (`locked: true`) and `<Locked>` sections must not end up in static output, client bundles, Markdown versions, `llms.txt`, OG images or sitemaps. Their images are rewritten to `privateId` at compile time (`remark-block-images.ts`); never import them any other way. Cover, title, lead and key facts of locked entries are public by design.
- **Static first.** Add `export const prerender = false` only for routes that need the password gate. On-demand routes must sit at public paths and read the variant from `Astro.locals.variant` (Vercel passes the original URL to functions).
- **No fixed domain.** Use `SITE_DOMAIN` (see `src/lib/domain.ts`). Never hardcode a hostname.
- **No secrets in the repo.** The password exists only as a hash in ENV.
- Content files are validated by schema; prefer better schema messages over runtime checks.
- Client JavaScript only where interaction needs it (video demos, clock, theme toggle). No UI frameworks.
- Accessibility: semantic HTML, visible focus, keyboard support, `prefers-reduced-motion`, AA contrast in both themes.
- Design: dark theme is the default, light theme equally polished. Design tokens as CSS custom properties. Mobile is the primary case.
- Design and content decisions go to Simon; technical decisions are made and documented here.

## Testing

- Unit tests in `tests/unit/` for everything in `src/lib/`.
- Visual check before each checkpoint: Playwright screenshots at 1440 px and 390 px, dark and light.
- Playwright uses the preinstalled Chromium (`/opt/pw-browsers`); do not run `playwright install`.
