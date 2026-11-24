import { describe, expect, it } from "vitest";
import {
  MAX_RVTOOLS_FILES,
  mergeRvtoolsFilesByName,
} from "./rvtoolsFileUpload";

function fileNamed(name: string): File {
  return new File(["content"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("mergeRvtoolsFilesByName", () => {
  it(`allows up to ${MAX_RVTOOLS_FILES} distinct files`, () => {
    const accepted = Array.from({ length: MAX_RVTOOLS_FILES }, (_, i) =>
      fileNamed(`vc${i}.xlsx`),
    );
    const result = mergeRvtoolsFilesByName([], accepted);
    expect(result.overLimit).toBe(false);
    expect(result.files).toHaveLength(MAX_RVTOOLS_FILES);
  });

  it("truncates and flags when over the limit", () => {
    const accepted = Array.from({ length: MAX_RVTOOLS_FILES + 3 }, (_, i) =>
      fileNamed(`vc${i}.xlsx`),
    );
    const result = mergeRvtoolsFilesByName([], accepted);
    expect(result.overLimit).toBe(true);
    expect(result.files).toHaveLength(MAX_RVTOOLS_FILES);
  });

  it("replaces files with the same name without counting as new", () => {
    const current = [fileNamed("a.xlsx")];
    const accepted = [fileNamed("a.xlsx"), fileNamed("b.xlsx")];
    const result = mergeRvtoolsFilesByName(current, accepted);
    expect(result.files).toHaveLength(2);
    expect(result.overLimit).toBe(false);
  });
});
