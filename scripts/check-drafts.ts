/**
 * Lists open placeholders ([Screen: …], […]) in all content.
 * Usage: npm run check:drafts [-- <variant-id>]
 * Exits with 1 when a variant's case studies contain placeholders.
 */
import { collectDraftReport, formatDraftFile } from "../src/lib/content/drafts";

const variant = process.argv[2];
const report = collectDraftReport(process.cwd(), variant);

if (report.blocking.length) {
  console.log("Blocking (used by an application variant):");
  for (const entry of report.blocking) {
    console.log(`  → ${entry.variants.join(", ")}`);
    console.log(formatDraftFile(entry));
  }
}
if (report.warnings.length && !variant) {
  console.log("Open placeholders (not used by a variant):");
  for (const entry of report.warnings) console.log(formatDraftFile(entry));
}
if (!report.blocking.length && (variant || !report.warnings.length)) {
  console.log(variant ? `Variant "${variant}" has no open placeholders.` : "No open placeholders.");
}
process.exit(report.blocking.length ? 1 : 0);
