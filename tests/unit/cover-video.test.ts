import { describe, expect, it } from "vitest";
import { coverVideo } from "../../src/lib/cover-video";

describe("coverVideo", () => {
  it("finds the cover and card encodes next to a case study", () => {
    const video = coverVideo("swissgeol-assets");
    expect(video?.page.mp4).toMatch(/cover\.mp4/);
    expect(video?.page.webm).toMatch(/cover\.webm/);
    expect(video?.card.mp4).toMatch(/cover-card\.mp4/);
  });

  it("is undefined without a cover video, and ignores body videos", () => {
    expect(coverVideo("ledger-onboarding")).toBeUndefined();
    expect(coverVideo("care-scheduling")).toBeUndefined();
  });
});
