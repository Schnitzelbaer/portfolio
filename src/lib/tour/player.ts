import { TourAborted, TourClock } from "./clock";
import { chapterAt, computeTimeline, DEFAULTS, type Timeline } from "./timeline";
import type { PrototypeHandle, ShowcaseVariant, ShowcaseVariantConfig, TourStep } from "./types";

/**
 * Client-side tour player. One instance per `[data-showcase]` element.
 *
 * - Loads only the variant whose media query matches, and only when the showcase nears the
 *   viewport. Public variants come from the Vite glob below; locked ones from `data-private-base`.
 * - Plays while visible, pauses when scrolled away or when the tab is hidden.
 * - With `prefers-reduced-motion`, nothing autoplays; a click plays the tour without cursor
 *   travel or typing animation.
 * - The prototype is `inert`: visitors watch, they cannot click into it.
 */

const publicVariants = import.meta.glob<{ default: ShowcaseVariant }>("/showcases/*/variants/*.ts");

const ease = (t: number) => 1 - (1 - t) ** 3;

class TourPlayer {
  readonly el: HTMLElement;
  readonly id: string;
  readonly variants: ShowcaseVariantConfig[];
  readonly clock = new TourClock();
  readonly reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

  stage: HTMLElement;
  viewport: HTMLElement;
  cursor: HTMLElement;
  caption: HTMLElement;
  fill: HTMLElement;
  ticks: HTMLElement;
  chapterLabel: HTMLElement;
  playButton: HTMLButtonElement;
  replayButton: HTMLButtonElement;

  current: ShowcaseVariantConfig | undefined;
  module: ShowcaseVariant | undefined;
  handle: PrototypeHandle | undefined;
  shadow: ShadowRoot | undefined;
  timeline: Timeline | undefined;
  cursorPos = { x: 0.5, y: 0.75 };
  token = 0;
  visible = false;
  userPaused = false;
  started = false;
  finished = false;
  loading: Promise<void> | undefined;
  progressFrame = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.id = el.dataset.showcase ?? "";
    this.variants = JSON.parse(el.dataset.variants ?? "[]");
    const q = <T extends HTMLElement>(selector: string) => el.querySelector<T>(selector) as T;
    this.stage = q("[data-stage]");
    this.viewport = q("[data-viewport]");
    this.cursor = q("[data-cursor]");
    this.caption = q("[data-caption]");
    this.fill = q("[data-progress]");
    this.ticks = q("[data-ticks]");
    this.chapterLabel = q("[data-chapter]");
    this.playButton = q("[data-play]");
    this.replayButton = q("[data-replay]");

    this.playButton.addEventListener("click", () => this.togglePlay());
    this.replayButton.addEventListener("click", () => this.replay());
    new ResizeObserver(() => this.layout()).observe(this.stage);
    document.addEventListener("visibilitychange", () => this.sync());
    for (const variant of this.variants) {
      if (variant.media)
        matchMedia(variant.media).addEventListener("change", () => this.onBreakpoint());
    }

    const near = new IntersectionObserver(
      (entries) => {
        // With reduced motion the static fallback stays until the visitor presses play.
        if (entries.some((e) => e.isIntersecting) && !this.reduced) {
          near.disconnect();
          void this.load();
        }
      },
      { rootMargin: "300px 0px" },
    );
    near.observe(el);
    new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.sync();
      },
      { threshold: 0.35 },
    ).observe(el);
  }

  get reduced(): boolean {
    return this.reducedQuery.matches;
  }

  get cursorEnabled(): boolean {
    return this.el.dataset.cursor !== "false";
  }

  pickVariant(): ShowcaseVariantConfig | undefined {
    return this.variants.find((v) => !v.media || matchMedia(v.media).matches);
  }

  async importVariant(name: string): Promise<ShowcaseVariant> {
    const privateBase = this.el.dataset.privateBase;
    if (privateBase) {
      const mod = await import(/* @vite-ignore */ `${privateBase}${name}.js`);
      return mod.default as ShowcaseVariant;
    }
    const loader = publicVariants[`/showcases/${this.id}/variants/${name}.ts`];
    if (!loader) throw new Error(`Showcase "${this.id}" has no variant "${name}"`);
    return (await loader()).default;
  }

  load(): Promise<void> {
    this.loading ??= (async () => {
      const variant = this.pickVariant();
      if (!variant) return;
      this.el.dataset.state = "loading";
      try {
        this.module = await this.importVariant(variant.name);
      } catch (error) {
        console.warn(error);
        this.el.dataset.state = "error";
        return;
      }
      this.current = variant;
      this.mount();
      this.timeline = computeTimeline(this.module.tour, this.reduced);
      this.renderTicks();
      this.el.dataset.state = "ready";
      if (!this.reduced) this.start();
      else this.updateButtons();
    })();
    return this.loading;
  }

  mount(): void {
    if (!this.module || !this.current) return;
    this.handle?.destroy?.();
    this.viewport.replaceChildren();
    const host = document.createElement("div");
    host.className = "showcase__host";
    this.viewport.append(host);
    this.shadow = host.attachShadow({ mode: "open" });
    this.handle = this.module.mount(this.shadow);
    const [w, h] = this.current.size;
    this.viewport.style.width = `${w}px`;
    this.viewport.style.height = `${h}px`;
    this.layout();
    this.cursorPos = { x: 0.5, y: 0.8 };
    this.placeCursor();
  }

  layout(): void {
    if (!this.current) return;
    const scale = this.stage.clientWidth / this.current.size[0];
    this.viewport.style.transform = `scale(${scale})`;
    this.placeCursor();
  }

  async onBreakpoint(): Promise<void> {
    const next = this.pickVariant();
    if (!this.loading || next?.name === this.current?.name) return;
    this.abort();
    this.loading = undefined;
    this.started = false;
    await this.load();
  }

  start(): void {
    this.started = true;
    this.finished = false;
    void this.run(++this.token);
    this.sync();
  }

  abort(): void {
    this.token++;
    this.clock.reset();
    cancelAnimationFrame(this.progressFrame);
  }

  replay(): void {
    if (!this.module) {
      void this.load().then(() => this.replay());
      return;
    }
    this.abort();
    if (this.handle?.reset) this.handle.reset();
    else this.mount();
    this.cursorPos = { x: 0.5, y: 0.8 };
    this.placeCursor();
    this.setCaption("");
    this.userPaused = false;
    this.start();
  }

  togglePlay(): void {
    if (!this.module) {
      this.userPaused = false;
      void this.load().then(() => {
        if (!this.started) this.start();
      });
      return;
    }
    if (!this.started || this.finished) {
      this.replay();
      return;
    }
    this.userPaused = !this.userPaused;
    this.sync();
  }

  /** Plays the clock only when started, visible, not paused by the user and the tab is shown. */
  sync(): void {
    const shouldPlay =
      this.started && !this.finished && this.visible && !this.userPaused && !document.hidden;
    if (shouldPlay && !this.clock.playing) {
      this.clock.play();
      this.trackProgress();
    } else if (!shouldPlay && this.clock.playing) {
      this.clock.pause();
    }
    this.el.dataset.playing = String(shouldPlay);
    this.updateButtons();
  }

  updateButtons(): void {
    const playing = this.started && !this.finished && !this.userPaused;
    this.playButton.setAttribute("aria-label", playing ? "Pause tour" : "Play tour");
    this.playButton.dataset.mode = playing ? "pause" : "play";
  }

  trackProgress(): void {
    cancelAnimationFrame(this.progressFrame);
    const frame = () => {
      const total = this.timeline?.total ?? 0;
      const progress = total ? Math.min(1, this.clock.elapsed / total) : 0;
      this.fill.style.transform = `scaleX(${progress})`;
      if (this.timeline) {
        const index = chapterAt(this.timeline, this.clock.elapsed);
        const label = this.timeline.chapters[index]?.label ?? "";
        if (this.chapterLabel.textContent !== label) this.chapterLabel.textContent = label;
      }
      if (this.clock.playing) this.progressFrame = requestAnimationFrame(frame);
    };
    this.progressFrame = requestAnimationFrame(frame);
  }

  renderTicks(): void {
    const timeline = this.timeline;
    if (!timeline?.total) return;
    this.ticks.replaceChildren(
      ...timeline.chapters
        .filter((c) => c.start > 0)
        .map((chapter) => {
          const tick = document.createElement("span");
          tick.className = "showcase__tick";
          tick.style.left = `${(chapter.start / timeline.total) * 100}%`;
          tick.title = chapter.label;
          return tick;
        }),
    );
  }

  async run(token: number): Promise<void> {
    const steps = this.module?.tour ?? [];
    try {
      for (const step of steps) {
        if (token !== this.token) return;
        await this.exec(step);
      }
      if (token !== this.token) return;
      this.finished = true;
      this.sync();
      this.fill.style.transform = "scaleX(1)";
      if (this.el.dataset.loop !== "false" && !this.reduced) {
        await new Promise((r) => setTimeout(r, 2200));
        if (token === this.token && !this.userPaused) this.replay();
      }
    } catch (error) {
      if (!(error instanceof TourAborted)) console.warn(error);
    }
  }

  query(selector: string): HTMLElement | null {
    return (this.shadow?.querySelector(selector) as HTMLElement | null) ?? null;
  }

  center(el: Element): { x: number; y: number } {
    const rect = el.getBoundingClientRect();
    const stage = this.stage.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - stage.left) / stage.width,
      y: (rect.top + rect.height / 2 - stage.top) / stage.height,
    };
  }

  placeCursor(): void {
    this.cursor.style.transform = `translate(${this.cursorPos.x * this.stage.clientWidth}px, ${this.cursorPos.y * this.stage.clientHeight}px)`;
  }

  setCaption(text: string): void {
    this.caption.textContent = text;
    this.caption.dataset.visible = String(Boolean(text));
  }

  async exec(step: TourStep): Promise<void> {
    const clock = this.clock;
    switch (step.type) {
      case "chapter":
        return;
      case "caption":
        this.setCaption(step.text);
        return;
      case "wait":
        await clock.wait(step.ms);
        return;
      case "move": {
        const target = this.query(step.to);
        if (!target || !this.cursorEnabled) return;
        const to = this.center(target);
        if (step.offset) {
          to.x += step.offset[0] / this.stage.clientWidth;
          to.y += step.offset[1] / this.stage.clientHeight;
        }
        const from = { ...this.cursorPos };
        const ms = this.reduced ? 0 : (step.ms ?? DEFAULTS.move);
        this.cursor.dataset.visible = "true";
        await clock.wait(ms, (p) => {
          const t = ease(p);
          this.cursorPos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
          this.placeCursor();
        });
        this.cursorPos = to;
        this.placeCursor();
        return;
      }
      case "click": {
        const ms = step.ms ?? DEFAULTS.click;
        this.cursor.dataset.pressed = "true";
        await clock.wait(ms * 0.45);
        const target = step.target ? this.query(step.target) : null;
        target?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
        this.cursor.dataset.pressed = "false";
        await clock.wait(ms * 0.55);
        return;
      }
      case "type": {
        const input = this.query(step.target) as HTMLInputElement | null;
        if (!input) return;
        input.dataset.focused = "true";
        const perChar = this.reduced ? 0 : 1000 / (step.cps ?? DEFAULTS.cps);
        for (const char of step.text) {
          await clock.wait(perChar);
          input.value += char;
          input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        }
        delete input.dataset.focused;
        return;
      }
      case "scroll": {
        const container = this.query(step.target);
        if (!container) return;
        const from = container.scrollTop;
        const to =
          typeof step.to === "number"
            ? step.to
            : ((this.query(step.to) as HTMLElement | null)?.offsetTop ?? from);
        await clock.wait(this.reduced ? 0 : (step.ms ?? DEFAULTS.scroll), (p) => {
          container.scrollTop = from + (to - from) * ease(p);
        });
        return;
      }
      case "state":
        this.handle?.setState?.(step.name, step.value);
        return;
      case "highlight": {
        const el = this.query(step.target);
        el?.setAttribute("data-highlight", "");
        await clock.wait(step.ms ?? DEFAULTS.highlight);
        el?.removeAttribute("data-highlight");
        return;
      }
    }
  }
}

export function initShowcases(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-showcase]:not([data-bound])")) {
    el.dataset.bound = "";
    new TourPlayer(el);
  }
}
