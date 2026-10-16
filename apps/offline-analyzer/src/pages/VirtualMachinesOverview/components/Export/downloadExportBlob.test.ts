import { describe, expect, it } from "vitest";
import { getExportFilename } from "./downloadExportBlob";

describe("export filenames", () => {
  const date = new Date("2026-07-01T15:30:00");

  it("selects filename by export format", () => {
    expect(getExportFilename("zip", date)).toBe(
      "migration-export-2026-07-01.zip",
    );
    expect(getExportFilename("xlsx", date)).toBe(
      "migration-export-2026-07-01.xlsx",
    );
  });
});
