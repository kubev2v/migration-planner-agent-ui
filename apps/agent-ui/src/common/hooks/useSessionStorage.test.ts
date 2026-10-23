import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import useSessionStorage from "./useSessionStorage";

describe("useSessionStorage", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useSessionStorage("test-key", "all"));
    expect(result.current[0]).toBe("all");
  });

  it("persists updates across remounts", () => {
    const { result, unmount } = renderHook(() =>
      useSessionStorage("test-key", "all"),
    );

    act(() => {
      result.current[1]("cluster-a");
    });
    expect(result.current[0]).toBe("cluster-a");

    unmount();

    const { result: remounted } = renderHook(() =>
      useSessionStorage("test-key", "all"),
    );
    expect(remounted.current[0]).toBe("cluster-a");
  });

  it("ignores stored values from a different version", () => {
    sessionStorage.setItem(
      "test-key",
      JSON.stringify({ version: 1, value: "stale" }),
    );

    const { result } = renderHook(() =>
      useSessionStorage("test-key", "all", 2),
    );
    expect(result.current[0]).toBe("all");
  });
});
