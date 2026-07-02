import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelForecast,
  cancelForecastPair,
  deleteAllForecastRuns,
  ForecasterNotFoundError,
} from "./forecasterApi";
import type { ForecastRun } from "./forecasterTypes";

const BASE_PATH = "/api/v1";

const sampleRun = (id: number): ForecastRun => ({
  id,
  sessionId: 1,
  pairName: `pair-${id}`,
  sourceDatastore: "ds-source",
  targetDatastore: "ds-target",
  iteration: 1,
  diskSizeGb: 100,
  durationSec: 10,
  throughputMbps: 100,
  createdAt: "2024-01-01T00:00:00Z",
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

describe("cancelForecast", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws ForecasterNotFoundError when no benchmark is running", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ error: "No active benchmark" }, 404)),
    );

    await expect(cancelForecast(BASE_PATH)).rejects.toMatchObject({
      name: "ForecasterNotFoundError",
      message: "No active benchmark",
    });
  });

  it("returns status on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ state: "ready" }, 202));

    await expect(cancelForecast(BASE_PATH)).resolves.toEqual({
      state: "ready",
    });
  });
});

describe("cancelForecastPair", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws ForecasterNotFoundError when the pair is not active", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Pair not found" }, 404));

    await expect(
      cancelForecastPair(BASE_PATH, "missing-pair"),
    ).rejects.toBeInstanceOf(ForecasterNotFoundError);
  });

  it("returns canceled state on success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ pairName: "pair-a", state: "canceled" }, 202),
    );

    await expect(cancelForecastPair(BASE_PATH, "pair-a")).resolves.toEqual({
      pairName: "pair-a",
      state: "canceled",
    });
  });
});

describe("deleteAllForecastRuns", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes all runs when the forecaster is idle", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          return Promise.resolve(jsonResponse({ state: "ready" }));
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([sampleRun(1), sampleRun(2)]));
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/1")) {
          return Promise.resolve(emptyResponse());
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/2")) {
          return Promise.resolve(emptyResponse());
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await deleteAllForecastRuns(BASE_PATH);

    const deleteCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "DELETE",
    );
    expect(deleteCalls).toHaveLength(2);
    expect(String(deleteCalls[0][0])).toContain("/forecaster/runs/1");
    expect(String(deleteCalls[1][0])).toContain("/forecaster/runs/2");
  });

  it("cancels a running benchmark before deleting runs", async () => {
    let statusChecks = 0;
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          statusChecks += 1;
          return Promise.resolve(
            jsonResponse(
              statusChecks === 1
                ? { state: "running", pairs: [] }
                : { state: "ready" },
            ),
          );
        }
        if (method === "DELETE" && url.endsWith("/forecaster")) {
          return Promise.resolve(jsonResponse({ state: "ready" }, 202));
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([sampleRun(3)]));
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/3")) {
          return Promise.resolve(emptyResponse());
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await deleteAllForecastRuns(BASE_PATH);

    const cancelCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        init?.method === "DELETE" && String(url).endsWith("/forecaster"),
    );
    expect(cancelCall).toBeDefined();
    expect(statusChecks).toBeGreaterThanOrEqual(2);
  });

  it("returns without deleting when there are no runs", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          return Promise.resolve(jsonResponse({ state: "ready" }));
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([]));
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await deleteAllForecastRuns(BASE_PATH);

    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
  });

  it("still deletes runs when status cannot be fetched", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          return Promise.resolve(jsonResponse({ error: "unavailable" }, 500));
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([sampleRun(4)]));
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/4")) {
          return Promise.resolve(emptyResponse());
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await deleteAllForecastRuns(BASE_PATH);

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === "DELETE" &&
          String(url).endsWith("/forecaster/runs/4"),
      ),
    ).toBe(true);
  });

  it("still deletes runs when canceling a running benchmark fails", async () => {
    let statusChecks = 0;
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          statusChecks += 1;
          return Promise.resolve(
            jsonResponse(
              statusChecks === 1
                ? { state: "running", pairs: [] }
                : { state: "ready" },
            ),
          );
        }
        if (method === "DELETE" && url.endsWith("/forecaster")) {
          return Promise.resolve(
            jsonResponse({ error: "pipeline is stopped" }, 500),
          );
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([sampleRun(7)]));
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/7")) {
          return Promise.resolve(emptyResponse());
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await deleteAllForecastRuns(BASE_PATH);

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === "DELETE" &&
          String(url).endsWith("/forecaster/runs/7"),
      ),
    ).toBe(true);
  });

  it("throws when some run deletions fail", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/forecaster")) {
          return Promise.resolve(jsonResponse({ state: "ready" }));
        }
        if (method === "GET" && url.includes("/forecaster/runs")) {
          return Promise.resolve(jsonResponse([sampleRun(5), sampleRun(6)]));
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/5")) {
          return Promise.resolve(emptyResponse());
        }
        if (method === "DELETE" && url.endsWith("/forecaster/runs/6")) {
          return Promise.resolve(jsonResponse({ error: "failed" }, 500));
        }

        return Promise.reject(new Error(`Unexpected fetch: ${method} ${url}`));
      },
    );

    await expect(deleteAllForecastRuns(BASE_PATH)).rejects.toThrow(
      "Failed to remove 1 of 2 estimation run(s): run 6 (pair-6): failed",
    );
  });
});
