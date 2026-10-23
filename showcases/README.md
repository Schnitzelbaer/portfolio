# Showcases

Code-based tour animations embedded in case studies with `<Showcase id="…" caption="…" />`.
No videos: prototypes are real HTML/CSS/JS, scaled to fit, always sharp.

## Folder contract

```
showcases/<id>/
  showcase.config.ts       # title, description, variants (media query + design size)
  variants/<name>.ts       # one file per variant: export default { mount(shadowRoot), tour }
  fallback-<name>.webp     # static first frame per variant (generated, see below)
showcases/_locked/<id>/    # same, for showcases that may only load after the password
```

Replace a dummy by replacing its folder. Anything goes inside `mount()` (vanilla DOM, a
framework, canvas), as long as it renders into the given shadow root and returns a handle
(`reset`, `setState`, `destroy` are optional). Types: `src/lib/tour/types.ts`.

- Only the variant whose `media` matches is downloaded, and only when the showcase nears the
  viewport. The first variant without `media` is the default.
- The prototype is inert: visitors cannot click into it. The tour drives it with synthetic
  clicks, typing and `setState` calls.
- Tours are declarative steps (`chapter`, `caption`, `wait`, `move`, `click`, `type`, `scroll`,
  `state`, `highlight`). Chapters become marks on the timeline.
- With `prefers-reduced-motion` the fallback image stays until the visitor presses play; the tour
  then runs without cursor travel or typing animation.
- Locked showcases must not import images in their config. Their code is never part of the public
  build; it is served by the password gate (phase e).

## Fallback frames

```sh
npm run dev
npm run showcases:fallbacks
```

Screenshots every public variant at its design size into `fallback-<variant>.webp`. They are
picked up automatically.
