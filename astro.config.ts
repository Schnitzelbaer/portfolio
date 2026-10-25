import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import { defineConfig, envField } from "astro/config";
import { draftGate } from "./src/integrations/draft-gate";
import { remarkBlockImages } from "./src/lib/content/remark-block-images";
import { remarkPlaceholders } from "./src/lib/content/remark-placeholders";
import { siteUrl } from "./src/lib/domain";

/** Files built by scripts/build-private.ts; bundled only into the server function. */
function privateFiles(dir = "private"): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? privateFiles(path) : [`./${relative(".", path)}`];
  });
}

export default defineConfig({
  site: siteUrl(process.env.SITE_DOMAIN),
  trailingSlash: "never",
  devToolbar: { enabled: false },
  build: { format: "file" },
  adapter: vercel({ includeFiles: privateFiles() }),
  integrations: [mdx(), draftGate()],
  // Browsers the CSS is compiled for: the minifier adds vendor prefixes (e.g. -webkit-backdrop-filter
  // for Safari before 18) from this list, so source CSS stays unprefixed.
  vite: { build: { cssTarget: ["chrome111", "edge111", "firefox114", "safari16.4", "ios16.4"] } },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkPlaceholders, remarkBlockImages],
    }),
  },
  env: {
    schema: {
      SITE_DOMAIN: envField.string({
        context: "server",
        access: "public",
        default: "portfolio.localhost",
      }),
      // Hash of the case study password (npm run password:hash). Never the password itself.
      LOCK_PASSWORD_HASH: envField.string({ context: "server", access: "secret", optional: true }),
      // Random secret that signs the unlock cookie.
      LOCK_COOKIE_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
