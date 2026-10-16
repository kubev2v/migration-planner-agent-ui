import { describe, expect, it } from "vitest";
import { getCollectionProgressInfo } from "./collectionProgress";

describe("getCollectionProgressInfo", () => {
  it("maps in-progress collector statuses", () => {
    expect(getCollectionProgressInfo("connecting")).toEqual({
      percentage: 20,
      statusText: "Connecting to vCenter...",
    });
    expect(getCollectionProgressInfo("collecting")).toEqual({
      percentage: 60,
      statusText: "Collecting inventory data...",
    });
    expect(getCollectionProgressInfo("collecting metrics")).toEqual({
      percentage: 60,
      statusText: "Collecting inventory data...",
    });
    expect(getCollectionProgressInfo("parsing")).toEqual({
      percentage: 90,
      statusText: "Parsing...",
    });
  });

  it("maps completed and error statuses", () => {
    expect(getCollectionProgressInfo("collected")).toEqual({
      percentage: 100,
      statusText: "Collection complete",
    });
    expect(getCollectionProgressInfo("error", "boom")).toEqual({
      percentage: 0,
      statusText: "Error: boom",
    });
  });
});
