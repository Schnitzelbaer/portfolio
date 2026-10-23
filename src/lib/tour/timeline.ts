import type { TourStep } from "./types";

export const DEFAULTS = { move: 700, click: 320, scroll: 600, highlight: 900, cps: 14 };

/** Clock time a step consumes. Reduced motion removes cursor travel and typing time. */
export function stepDuration(step: TourStep, reduced = false): number {
  switch (step.type) {
    case "wait":
      return step.ms;
    case "move":
      return reduced ? 0 : (step.ms ?? DEFAULTS.move);
    case "click":
      return step.ms ?? DEFAULTS.click;
    case "type":
      return reduced ? 0 : Math.round((step.text.length * 1000) / (step.cps ?? DEFAULTS.cps));
    case "scroll":
      return reduced ? 0 : (step.ms ?? DEFAULTS.scroll);
    case "highlight":
      return step.ms ?? DEFAULTS.highlight;
    default:
      return 0;
  }
}

export interface Timeline {
  total: number;
  /** Start time of each step. */
  starts: number[];
  chapters: Array<{ label: string; start: number; step: number }>;
}

export function computeTimeline(steps: TourStep[], reduced = false): Timeline {
  const starts: number[] = [];
  const chapters: Timeline["chapters"] = [];
  let time = 0;
  steps.forEach((step, i) => {
    starts.push(time);
    if (step.type === "chapter") chapters.push({ label: step.label, start: time, step: i });
    time += stepDuration(step, reduced);
  });
  return { total: time, starts, chapters };
}

/** Index of the chapter active at `time`, or -1 before the first chapter. */
export function chapterAt(timeline: Timeline, time: number): number {
  let index = -1;
  timeline.chapters.forEach((chapter, i) => {
    if (chapter.start <= time) index = i;
  });
  return index;
}
