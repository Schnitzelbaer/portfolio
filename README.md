# Portfolio

UX/UI portfolio of Simon Wirth. Astro on Vercel, content in Markdown/MDX.
Conventions and commands: [CLAUDE.md](CLAUDE.md). Stack decision: [docs/decisions/001-stack.md](docs/decisions/001-stack.md).

## Setup

```sh
npm install
cp .env.example .env
npm run dev   # http://portfolio.localhost:4321
```

## Add a case study

1. Write the case study in Notion. Start with the title, then a block of properties (`Lead:`, `Date:`, `Role:`, `Client:`, `Team:`, `Status:`, `Outcome:`, `Order:`, `Locked: Yes/No`, `Cover:`). Use callouts starting with "Decision:", "Achieved" or "Expected", a 🔒 callout for protected parts, and `[Screen: …]` / `[...]` for anything still missing.
2. Export the page from Notion as **Markdown & CSV** (subpages off).
3. Run `npm run import:notion -- ~/Downloads/Export.zip --slug my-case`. The command prints warnings for anything it could not map.
4. Open `content/work/my-case/index.mdx`, fill in what the warnings list, and check it at `npm run dev`. Open placeholders are highlighted.
5. Run `npm run check:drafts` until nothing blocks, then commit.

## Add an application variant

Phase (d) adds `npm run variant:new`. This section will describe it in five steps.
