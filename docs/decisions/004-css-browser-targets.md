# 004: CSS browser targets

**Decision:** `vite.build.cssTarget` in `astro.config.ts` lists the supported browsers (Chrome/Edge 111, Firefox 114, Safari/iOS 16.4). Source CSS is written unprefixed.

**Why:** The CSS minifier merges a property with its vendor-prefixed twin and keeps only the last one. Writing `backdrop-filter` and `-webkit-backdrop-filter` side by side silently dropped one of them (no blur in Chromium, or none in Safari before 18). With explicit targets the minifier adds exactly the prefixes these browsers need (`-webkit-backdrop-filter`, `-webkit-mask-image`).

**Consequence:** Do not hand-write vendor prefixes. Raise the targets when support for older Safari is dropped.
