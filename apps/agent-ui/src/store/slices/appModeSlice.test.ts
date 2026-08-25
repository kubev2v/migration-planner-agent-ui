import { describe, expect, test } from "vitest";
import { appModeReducer, setAppMode } from "./appModeSlice";

describe("appModeSlice", () => {
  test("defaults to disconnected", () => {
    expect(appModeReducer(undefined, { type: "@@INIT" })).toEqual({
      mode: "disconnected",
    });
  });

  test("setAppMode updates the mode", () => {
    expect(appModeReducer(undefined, setAppMode("rvtool"))).toEqual({
      mode: "rvtool",
    });
    expect(appModeReducer(undefined, setAppMode("connected"))).toEqual({
      mode: "connected",
    });
  });
});
