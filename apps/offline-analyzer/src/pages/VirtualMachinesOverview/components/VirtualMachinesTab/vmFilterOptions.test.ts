import { describe, expect, it } from "vitest";
import { parseVmTableFilterOptionsFromJson } from "./vmFilterOptions";

describe("parseVmTableFilterOptionsFromJson", () => {
  it("maps metadata into vSphere tag filter options", () => {
    const options = parseVmTableFilterOptionsFromJson(
      {
        clusters: ["c1"],
        datacenters: ["dc1"],
        concernLabels: [],
        concernCategories: [],
        applications: [],
        metadata: {
          Forklift: ["migrated"],
          ami: ["ttt"],
        },
      },
      ["prod"],
    );

    expect(options.vsphereTags).toEqual(["ami:ttt", "Forklift:migrated"]);
    expect(options.clusters).toEqual(["c1"]);
    expect(options.vmLabels).toEqual(["prod"]);
  });

  it("returns empty vSphere options when metadata is absent", () => {
    const options = parseVmTableFilterOptionsFromJson(
      {
        clusters: [],
        datacenters: [],
        concernLabels: [],
        concernCategories: [],
        applications: [],
      },
      [],
    );

    expect(options.vsphereTags).toEqual([]);
  });
});
