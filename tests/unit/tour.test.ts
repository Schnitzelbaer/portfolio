import { describe, expect, it } from "vitest";
import { TourAborted, TourClock } from "../../src/lib/tour/clock";
import { chapterAt, computeTimeline, stepDuration } from "../../src/lib/tour/timeline";
import type { TourStep } from "../../src/lib/tour/types";

const steps: TourStep[] = [
  { type: "chapter", label: "Intro" },
  { type: "wait", ms: 500 },
  { type: "move", to: "#a" },
  { type: "chapter", label: "Form" },
  { type: "type", target: "#name", text: "Anna", cps: 8 },
  { type: "click" },
];

describe("timeline", () => {
  it("sums step durations and places chapters", () => {
    const timeline = computeTimeline(steps);
    expect(timeline.total).toBe(500 + 700 + 500 + 320);
    expect(timeline.chapters).toEqual([
      { label: "Intro", start: 0, step: 0 },
      { label: "Form", start: 1200, step: 3 },
    ]);
    expect(chapterAt(timeline, 1199)).toBe(0);
    expect(chapterAt(timeline, 1200)).toBe(1);
  });

  it("drops cursor travel and typing time for reduced motion", () => {
    expect(stepDuration({ type: "move", to: "#a" }, true)).toBe(0);
    expect(stepDuration({ type: "type", target: "#a", text: "abc" }, true)).toBe(0);
    expect(computeTimeline(steps, true).total).toBe(500 + 320);
  });
});

function fakeClock() {
  let now = 0;
  const clock = new TourClock(
    () => now,
    () => 1,
    () => undefined,
  );
  return {
    clock,
    advance(ms: number) {
      now += ms;
      clock.tick();
    },
  };
}

describe("TourClock", () => {
  it("only advances while playing", async () => {
    const { clock, advance } = fakeClock();
    let done = false;
    clock.wait(100).then(() => {
      done = true;
    });
    clock.play();
    advance(60);
    clock.pause();
    advance(500);
    await Promise.resolve();
    expect(done).toBe(false);
    clock.play();
    advance(40);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(clock.elapsed).toBe(100);
  });

  it("reports animation progress and rejects waits on reset", async () => {
    const { clock, advance } = fakeClock();
    const progress: number[] = [];
    clock.play();
    const wait = clock.wait(100, (p) => progress.push(p));
    advance(50);
    expect(progress.at(-1)).toBe(0.5);
    clock.reset();
    await expect(wait).rejects.toBeInstanceOf(TourAborted);
  });
});
