import { describe, expect, it } from "vitest";
import { getExportFilename, getExportZipFilename } from "./downloadExportBlob";

describe("export filenames", () => {
  const date = new Date("2026-07-01T15:30:00");

  it("includes the local date in the zip filename", () => {
    expect(getExportZipFilename(date)).toBe("migration-export-2026-07-01.zip");
  });

  it("selects zip filename for export format", () => {
    expect(getExportFilename("zip", date)).toBe(
      "migration-export-2026-07-01.zip",
    );
  });
});
