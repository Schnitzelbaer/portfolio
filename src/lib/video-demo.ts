/**
 * Behaviour of `<Video>` demos (see src/components/blocks/Video.astro):
 * - Nothing loads until the video is near the viewport; then only the matching variant
 *   (mobile file on small screens, desktop file otherwise or as fallback).
 * - Muted, looping, inline autoplay while visible; pauses when scrolled away.
 * - With prefers-reduced-motion nothing starts on its own; the button starts it.
 * - One play/pause button: visible on hover (mouse), for a few seconds after a tap (touch),
 *   on keyboard focus, and whenever playback is not running on its own.
 */

interface Sources {
  desktop: { webm?: string; mp4?: string };
  mobile: { webm?: string; mp4?: string };
}

const MOBILE = "(max-width: 40rem)";
const HIDE_AFTER_MS = 3000;

function setup(root: HTMLElement) {
  const video = root.querySelector("video");
  const button = root.querySelector<HTMLButtonElement>("[data-video-toggle]");
  if (!video || !button) return;
  const sources = JSON.parse(root.dataset.sources ?? "{}") as Sources;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const labels = {
    pause: button.dataset.labelPause ?? "Pause video",
    play: button.dataset.labelPlay ?? "Play video",
  };

  let loaded = false;
  let visible = false;
  let userPaused = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const pick = () => {
    const mobile = matchMedia(MOBILE).matches && (sources.mobile.webm || sources.mobile.mp4);
    return mobile ? sources.mobile : sources.desktop;
  };

  const load = () => {
    if (loaded) return;
    loaded = true;
    const chosen = pick();
    for (const [type, src] of [
      ["video/webm", chosen.webm],
      ["video/mp4", chosen.mp4],
    ] as const) {
      if (!src) continue;
      const source = document.createElement("source");
      source.type = type;
      source.src = src;
      video.append(source);
    }
    video.load();
  };

  const render = () => {
    const playing = !video.paused && !video.ended;
    root.dataset.playing = String(playing);
    button.setAttribute("aria-label", playing ? labels.pause : labels.play);
    button.dataset.mode = playing ? "pause" : "play";
    // Keep the button visible whenever the video does not play on its own.
    root.toggleAttribute(
      "data-idle",
      !playing && (userPaused || reduced.matches || root.dataset.blocked === "true"),
    );
  };

  const play = () => {
    load();
    video.play().then(
      () => {
        root.dataset.blocked = "false";
        render();
      },
      () => {
        // Autoplay can be refused (e.g. power saving); the button then starts it.
        root.dataset.blocked = "true";
        render();
      },
    );
  };

  const sync = () => {
    if (visible && !userPaused && !reduced.matches) play();
    else if (!video.paused) video.pause();
  };

  const showControls = () => {
    root.dataset.controls = "visible";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      delete root.dataset.controls;
    }, HIDE_AFTER_MS);
  };

  button.addEventListener("click", () => {
    if (video.paused || video.ended) {
      userPaused = false;
      play();
    } else {
      userPaused = true;
      video.pause();
    }
    showControls();
  });

  // Touch: a tap on the video reveals the button; only a tap on the button toggles playback.
  root.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" || button.contains(event.target as Node)) return;
    showControls();
  });

  video.addEventListener("play", render);
  video.addEventListener("pause", render);
  video.addEventListener("playing", () => {
    root.dataset.started = "true";
    render();
  });
  reduced.addEventListener("change", sync);

  new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && !reduced.matches) load();
    },
    { rootMargin: "400px 0px" },
  ).observe(root);
  new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      sync();
    },
    { threshold: 0.25 },
  ).observe(root);
  render();
}

export function initVideoDemos(): void {
  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-video-demo]:not([data-ready])",
  )) {
    root.dataset.ready = "";
    setup(root);
  }
}
