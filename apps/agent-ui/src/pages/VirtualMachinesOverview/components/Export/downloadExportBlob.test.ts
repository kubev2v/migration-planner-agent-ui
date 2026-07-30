import { describe, expect, it } from "vitest";
import {
  getExportFilename,
  getExportXlsxFilename,
  getExportZipFilename,
} from "./downloadExportBlob";

describe("export filenames", () => {
  const date = new Date("2026-07-01T15:30:00");

  it("includes the local date in the zip filename", () => {
    expect(getExportZipFilename(date)).toBe("migration-export-2026-07-01.zip");
  });

  it("includes the local date in the xlsx filename", () => {
    expect(getExportXlsxFilename(date)).toBe(
      "migration-export-2026-07-01.xlsx",
    );
  });

  it("selects filename by export format", () => {
    expect(getExportFilename("zip", date)).toBe(
      "migration-export-2026-07-01.zip",
    );
    expect(getExportFilename("xlsx", date)).toBe(
      "migration-export-2026-07-01.xlsx",
    );
  });
});
