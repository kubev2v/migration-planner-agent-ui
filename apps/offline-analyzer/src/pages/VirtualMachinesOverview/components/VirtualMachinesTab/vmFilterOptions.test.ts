import { describe, expect, it } from "vitest";
import { mergeGroupNamesIntoFilterOptions } from "./vmFilterOptions";

describe("mergeGroupNamesIntoFilterOptions", () => {
  it("adds membership group names to empty filter options", () => {
    expect(
      mergeGroupNamesIntoFilterOptions(undefined, ["group2", "group1"]),
    ).toEqual({
      clusters: [],
      datacenters: [],
      concernLabels: [],
      concernCategories: [],
      vmLabels: [],
      groups: ["group1", "group2"],
    });
  });

  it("merges and deduplicates group names", () => {
    expect(
      mergeGroupNamesIntoFilterOptions(
        {
          clusters: [],
          datacenters: [],
          concernLabels: [],
          concernCategories: [],
          vmLabels: [],
          groups: ["group1"],
        },
        ["group2", "group1"],
      ).groups,
    ).toEqual(["group1", "group2"]);
  });
});
