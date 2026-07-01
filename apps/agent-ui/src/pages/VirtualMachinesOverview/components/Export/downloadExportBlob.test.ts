import { describe, expect, it } from "vitest";
import { getExportZipFilename } from "./downloadExportBlob";

describe("getExportZipFilename", () => {
  it("includes the local date in the zip filename", () => {
    expect(getExportZipFilename(new Date("2026-07-01T15:30:00"))).toBe(
      "migration-export-2026-07-01.zip",
    );
  });
});
