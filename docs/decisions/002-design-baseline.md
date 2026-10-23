# 002: Design baseline (reference rebuild)

- Status: accepted
- Date: 2026-10-23

## Context

Simon asked for the look of abstract.systems to be rebuilt as closely as possible, animations included. He will develop the site's own character later. The reference site is blocked by the network policy of the build environment, so the rebuild is based on five screenshots (desktop and mobile; About, Work, Stack).

## Decision

- **Measured from the screenshots:** background `#17161d`, centered reading column, pill navigation with icon + label (inactive tabs collapse to icons on small screens), uppercase section labels with a block cursor, mono micro labels, dotted leader rows, pill tags, thin dividers, fixed corner controls ("For agents" bottom left, status bottom right), bottom fade, Work page as a full-width card grid with 24 px gutters and 18 px radius.
- **Deviations required by the brief:** body text 17 px (16 px mobile) instead of ~15 px, column widened proportionally to 31 rem; every text color meets WCAG AA on all backgrounds (enforced by `tests/unit/contrast.test.ts`); a light theme with the same structure; project cards show title, role and outcome.
- **Fonts:** Inter (variable, latin subset) for text and Geist Mono for micro labels, both OFL and self-hosted in `src/assets/fonts/`. The reference fonts could not be identified with certainty; these are the closest free matches.
- **Animations (assumed, since they cannot be observed in screenshots):** staggered rise-and-unblur on page entry, blinking block cursor, live clock with rolling digits, pulsing status dot, sliding nav pill between pages via cross-document View Transitions (no JavaScript), image zoom on card hover, spring toggle thumbs. All are disabled under `prefers-reduced-motion`.

## Consequences

- When the reference becomes reachable, measure spacing, timing and easing with Playwright and adjust `src/styles/tokens.css`; components only use tokens.
- Theme choice is stored in `localStorage` and applied by an inline script before first paint. Dark is the default regardless of the system setting, as the brief asks.
