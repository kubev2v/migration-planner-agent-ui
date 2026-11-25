import { describe, expect, it } from "vitest";
import {
  mergeGroupNamesIntoFilterOptions,
  parseVmTableFilterOptionsFromJson,
} from "./vmFilterOptions";

describe("parseVmTableFilterOptionsFromJson", () => {
  it("maps metadata into vSphere tag filter options", () => {
    const options = parseVmTableFilterOptionsFromJson(
      {
        metadata: {
          Forklift: ["migrated"],
          ami: ["ttt"],
        },
        clusters: ["c1"],
        datacenters: ["dc1"],
        concernLabels: [],
        concernCategories: [],
        applications: ["SAP ERP"],
      },
      ["prod"],
      ["group-a"],
    );

    expect(options.vsphereTags).toEqual(["ami:ttt", "Forklift:migrated"]);
    expect(options.applications).toEqual(["SAP ERP"]);
    expect(options.groups).toEqual(["group-a"]);
  });
});

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
      vsphereTags: [],
      groups: ["group1", "group2"],
      applications: [],
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
          vsphereTags: [],
          groups: ["group1"],
          applications: [],
        },
        ["group2", "group1"],
      ).groups,
    ).toEqual(["group1", "group2"]);
  });
});
