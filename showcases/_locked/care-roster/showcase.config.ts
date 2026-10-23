import { defineShowcase } from "../../../src/lib/tour/types";

// Locked showcase: no image imports here (anything imported could end up in public assets).
export default defineShowcase({
  title: "Kindred roster",
  description:
    "A sick call opens a gap in the weekly roster. The tool proposes replacements ranked by travel time and continuity of care, and the coordinator confirms one.",
  variants: [{ name: "default", size: [1180, 720] }],
});
