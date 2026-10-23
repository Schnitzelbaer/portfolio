import { defineShowcase } from "../../src/lib/tour/types";

export default defineShowcase({
  title: "Onboarding flow",
  description:
    "An animated diagram of the new onboarding flow: personal details, ID check with a recovery loop for failed scans, and the first deposit, which now comes after the account benefits.",
  kind: "diagram",
  cursor: false,
  variants: [
    { name: "vertical", media: "(max-width: 40rem)", size: [390, 620] },
    { name: "horizontal", size: [1000, 340] },
  ],
});
