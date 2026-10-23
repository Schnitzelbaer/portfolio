import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { collectDraftReport, formatDraftFile } from "../lib/content/drafts";

/**
 * Fails production builds while case studies used by an application variant still contain
 * open placeholders. Set `ALLOW_DRAFTS=1` to build anyway.
 */
export function draftGate(): AstroIntegration {
  let root = process.cwd();
  return {
    name: "portfolio:draft-gate",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = fileURLToPath(config.root);
      },
      "astro:build:start": ({ logger }) => {
        const report = collectDraftReport(root);
        for (const entry of report.warnings) {
          logger.warn(`Open placeholders (not used by a variant):\n${formatDraftFile(entry)}`);
        }
        if (!report.blocking.length) return;
        const details = report.blocking
          .map((entry) => `  Variant(s) ${entry.variants.join(", ")}:\n${formatDraftFile(entry)}`)
          .join("\n");
        if (process.env.ALLOW_DRAFTS === "1") {
          logger.warn(`ALLOW_DRAFTS=1, building despite open placeholders:\n${details}`);
          return;
        }
        throw new Error(
          `Application variants contain open placeholders. Fill them in or build with ALLOW_DRAFTS=1.\n${details}`,
        );
      },
    },
  };
}
