import { describe, expect, it } from "vitest";
import { mediaRange } from "../../src/lib/private-assets";

describe("mediaRange", () => {
  it("serves the whole file without a Range header", () => {
    expect(mediaRange(null, 1000, 100)).toEqual({ start: 0, end: 999, partial: false });
  });

  it("caps open-ended and large ranges to one chunk", () => {
    expect(mediaRange("bytes=0-", 1000, 100)).toEqual({ start: 0, end: 99, partial: true });
    expect(mediaRange("bytes=950-2000", 1000, 100)).toEqual({
      start: 950,
      end: 999,
      partial: true,
    });
    expect(mediaRange("bytes=10-19", 1000, 100)).toEqual({ start: 10, end: 19, partial: true });
  });

  it("supports suffix ranges and rejects unsatisfiable ones", () => {
    expect(mediaRange("bytes=-50", 1000, 100)).toEqual({ start: 950, end: 999, partial: true });
    expect(mediaRange("bytes=1000-", 1000, 100)).toBeUndefined();
    expect(mediaRange("bytes=abc", 1000, 100)).toBeUndefined();
  });
});
