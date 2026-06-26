import { describe, expect, it } from "vitest";
import { diskSizeRanges, parseDiskTierLabelToRange } from "./vmTableShared";

describe("diskSizeRanges", () => {
  it("matches GiB/TiB tiers used by inventory summaries", () => {
    for (const range of diskSizeRanges) {
      expect(parseDiskTierLabelToRange(range.label)).toEqual({
        min: range.min,
        max: range.max,
      });
    }
  });
});

describe("parseDiskTierLabelToRange", () => {
  it("parses GiB disk tiers from inventory summaries", () => {
    expect(parseDiskTierLabelToRange("0-100GiB")).toEqual({
      min: 0,
      max: 102400,
    });
    expect(parseDiskTierLabelToRange("100-500GiB")).toEqual({
      min: 102400,
      max: 512000,
    });
    expect(parseDiskTierLabelToRange("500GiB-1TiB")).toEqual({
      min: 512000,
      max: 1024 * 1024,
    });
    expect(parseDiskTierLabelToRange("1-2TiB")).toEqual({
      min: 1024 * 1024,
      max: 2 * 1024 * 1024,
    });
    expect(parseDiskTierLabelToRange("2-5TiB")).toEqual({
      min: 2 * 1024 * 1024,
      max: 5 * 1024 * 1024,
    });
  });

  it("parses legacy TB migration tiers", () => {
    expect(parseDiskTierLabelToRange("0-10 TB")).toEqual({
      min: 0,
      max: 10 * 1024 * 1024,
    });
    expect(parseDiskTierLabelToRange("50+ TB")).toEqual({
      min: 50 * 1024 * 1024 + 1,
      max: undefined,
    });
    expect(parseDiskTierLabelToRange("> 50 TB")).toEqual({
      min: 50 * 1024 * 1024 + 1,
      max: undefined,
    });
  });
});
