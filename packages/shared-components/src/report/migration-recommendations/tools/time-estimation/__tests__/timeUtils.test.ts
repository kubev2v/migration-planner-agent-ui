import { describe, expect, it } from "vitest";

import {
  durationToHours,
  formatDuration,
  formatHumanDuration,
  parseDuration,
} from "../timeUtils.js";

// ---------------------------------------------------------------------------
// parseDuration
// ---------------------------------------------------------------------------

describe("parseDuration", () => {
  it("parses hours, minutes and seconds", () => {
    expect(parseDuration("989h19m27s")).toBe(989 * 3600 + 19 * 60 + 27);
  });

  it("parses fractional seconds", () => {
    expect(parseDuration("1h0m30.5s")).toBeCloseTo(3630.5);
  });

  it("parses standalone seconds", () => {
    expect(parseDuration("90s")).toBe(90);
  });

  it("parses milliseconds", () => {
    expect(parseDuration("500ms")).toBeCloseTo(0.5);
  });

  it("parses microseconds (us)", () => {
    expect(parseDuration("1000us")).toBeCloseTo(0.001);
  });

  it("parses microseconds (µs / μs)", () => {
    expect(parseDuration("1000µs")).toBeCloseTo(0.001);
    expect(parseDuration("1000μs")).toBeCloseTo(0.001);
  });

  it("parses nanoseconds", () => {
    expect(parseDuration("1000000000ns")).toBeCloseTo(1);
  });

  it("returns 0 for an empty string", () => {
    expect(parseDuration("")).toBe(0);
  });

  it("handles a complex Go duration with fractional seconds", () => {
    const seconds = parseDuration("989h19m27.587096774s");
    expect(seconds).toBeCloseTo(989 * 3600 + 19 * 60 + 27.587096774, 5);
  });

  it("preserves a leading negative sign across multiple tokens", () => {
    expect(parseDuration("-1h30m")).toBe(-(3600 + 30 * 60));
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
  it("formats days, hours and minutes", () => {
    expect(formatDuration("49h30m0s")).toBe("2 days 1 hour 30 minutes");
  });

  it("returns '0 minutes' for zero-length durations", () => {
    expect(formatDuration("0s")).toBe("0 minutes");
    expect(formatDuration("")).toBe("0 minutes");
  });

  it("uses singular forms correctly", () => {
    expect(formatDuration("25h1m15s")).toBe("1 day 1 hour 1 minute");
  });

  it("omits zero-valued higher units", () => {
    expect(formatDuration("45m0s")).toBe("45 minutes");
  });

  it("omits minutes when exactly zero but has larger units", () => {
    expect(formatDuration("48h0m0s")).toBe("2 days");
  });
});

// ---------------------------------------------------------------------------
// durationToHours
// ---------------------------------------------------------------------------

describe("durationToHours", () => {
  it("returns 1 for anything under an hour", () => {
    expect(durationToHours("30m")).toBe(1);
    expect(durationToHours("1s")).toBe(1);
  });

  it("returns exact hours for whole-hour durations", () => {
    expect(durationToHours("2h0m0s")).toBe(2);
  });

  it("rounds up partial hours", () => {
    expect(durationToHours("2h1m0s")).toBe(3);
  });

  it("handles large durations", () => {
    expect(durationToHours("989h19m27s")).toBe(990);
  });
});

// ---------------------------------------------------------------------------
// formatHumanDuration
// ---------------------------------------------------------------------------

describe("formatHumanDuration", () => {
  it("formats small values as hours", () => {
    expect(formatHumanDuration(5)).toBe("5 hours");
    expect(formatHumanDuration(23)).toBe("23 hours");
  });

  it("uses singular 'hour' when value is 1", () => {
    expect(formatHumanDuration(1)).toBe("1 hour");
  });

  it("formats 24 hours as singular day", () => {
    expect(formatHumanDuration(24)).toBe("1 day");
  });

  it("formats 24+ hours as days (rounded up)", () => {
    expect(formatHumanDuration(48)).toBe("2 days");
    expect(formatHumanDuration(49)).toBe("3 days");
  });

  it("formats 730 hours as singular month", () => {
    expect(formatHumanDuration(730)).toBe("1 month");
  });

  it("formats multiple months", () => {
    expect(formatHumanDuration(1460)).toBe("2 months");
  });

  it("formats fractional months with one decimal", () => {
    expect(formatHumanDuration(1095)).toBe("1.5 months");
  });
});
