import { describe, expect, test } from "vitest";
import { groupChangeTags } from "./groupTags";

describe("groupChangeTags", () => {
  test("returns the group-scoped triple for a given group id", () => {
    expect(groupChangeTags("g1")).toEqual([
      { type: "Group", id: "g1" },
      { type: "GroupVms", id: "g1" },
      { type: "GroupInventory", id: "g1" },
    ]);
  });

  test("returns an empty set when no group is in scope", () => {
    expect(groupChangeTags()).toEqual([]);
    expect(groupChangeTags(undefined)).toEqual([]);
  });
});
