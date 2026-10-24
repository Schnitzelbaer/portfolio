# 003: Demos as pre-produced videos

- Status: accepted (replaces the code-based tour framework)
- Date: 2026-10-24

## Context

Demos (screen flows, rebuilt web apps, explanatory animations) were first planned as live, code-based prototypes with a scripted tour. Simon decided to produce them as videos instead: simpler to make, identical on every device, and no prototype code to maintain in this repository.

## Decision

- One MDX block, `<Video>`, with desktop and optional mobile sources (WebM first, MP4/H.264 as fallback), poster, aspect ratio, alt text and optional caption. Paths are relative to the case study, like images.
- Behaviour (`src/lib/video-demo.ts`, no libraries): nothing loads until the video is within 400 px of the viewport; then only the matching variant is attached (mobile file on viewports up to 40 rem, desktop file otherwise or as fallback). Muted, looping, inline autoplay while at least a quarter is visible; pauses when it leaves. No native controls, no timeline.
- One round play/pause button, bottom right: shown on hover with a mouse, for three seconds after a tap on touch devices (only a tap on the visible button toggles), on keyboard focus, and permanently while the video does not play on its own (reduced motion, refused autoplay, paused by the visitor on touch). Labels "Pause video" / "Play video" (English, like the rest of the site).
- `prefers-reduced-motion`: nothing autoplays or loads; the poster stays until the visitor presses play.
- Poster and a fixed aspect ratio (from the poster size unless set) prevent layout shifts.
- Videos inside locked content are never imported. The content pipeline rewrites them to `/protected/media/<opaque id>.<ext>`, `scripts/build-private.ts` copies them into `private/media/`, and the gated endpoint serves them with Range support in slices of at most 2 MB (Vercel limits a function response to 4.5 MB).

## Consequences

- Removed: `showcases/`, the tour player, the Showcase block, the showcase preview route and fallback script, and the private showcase bundles.
- Videos are committed to the repository next to their case study. Keep them short and compressed (the dummy demos are 60–400 KB each); for long or large videos, consider a video host or Vercel Blob later.
- The dummy videos were recorded from the former prototypes and are placeholders until Simon's real recordings replace them.
