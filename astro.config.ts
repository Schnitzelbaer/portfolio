import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import { defineConfig, envField } from "astro/config";
import { draftGate } from "./src/integrations/draft-gate";
import { remarkBlockImages } from "./src/lib/content/remark-block-images";
import { remarkPlaceholders } from "./src/lib/content/remark-placeholders";
import { siteUrl } from "./src/lib/domain";

export default defineConfig({
  site: siteUrl(process.env.SITE_DOMAIN),
  trailingSlash: "never",
  devToolbar: { enabled: false },
  build: { format: "file" },
  adapter: vercel(),
  integrations: [mdx(), draftGate()],
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
    },
  },
});
