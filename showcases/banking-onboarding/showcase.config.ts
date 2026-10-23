import { defineShowcase } from "../../src/lib/tour/types";

export default defineShowcase({
  title: "Brightvale onboarding",
  description:
    "A tour through the redesigned account opening: the six-step overview, the personal details form, an ID scan that fails with a specific hint and then succeeds, and the first deposit.",
  variants: [
    { name: "mobile", media: "(max-width: 40rem)", size: [390, 760] },
    { name: "desktop", size: [1180, 760] },
  ],
});
