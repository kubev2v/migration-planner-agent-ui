import type {
  ForecasterCredentials,
  ForecasterDatastore,
  ForecasterStatus,
  ForecastRun,
  ForecastStartRequest,
  ForecastStats,
  PairCapability,
  PairCapabilityRequest,
} from "./forecasterTypes";

function getForecasterBasePath(basePath: string): string {
  return `${basePath}/forecaster`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        const body = JSON.parse(text);
        if (body?.error) msg = body.error;
      }
    } catch (_) {
      // ignore parse errors
    }
    throw new Error(msg);
  }
  // Read as text first; some endpoints return 200/202 with no body
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Thrown when POST /forecaster/credentials returns 403 (insufficient vCenter privileges). */
export class CredentialsForbiddenError extends Error {
  constructor(
    message: string,
    public readonly missingPrivileges: string[],
  ) {
    super(message);
    this.name = "CredentialsForbiddenError";
  }
}

/** Thrown when POST /forecaster returns 409 (benchmark already running). */
export class ForecastConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForecastConflictError";
  }
}

/**
 * POST /collector — triggers the collector with vCenter credentials.
 * Throws CredentialsForbiddenError on 403.
 */
export async function postCredentials(
  basePath: string,
  credentials: ForecasterCredentials,
): Promise<void> {
  const res = await fetch(`${basePath}/collector`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (res.status === 403) {
    let body: { error?: string; missingPrivileges?: string[] } = {};
    try {
      body = await res.json();
    } catch (_) {
      // ignore
    }
    throw new CredentialsForbiddenError(
      body.error ?? "Insufficient vCenter privileges",
      body.missingPrivileges ?? [],
    );
  }
  await handleResponse<void>(res);
}

/**
 * PUT /forecaster/credentials — preflight check for the forecaster.
 * Validates connectivity and vSphere privileges. Credentials are NOT saved.
 * Throws CredentialsForbiddenError on 403.
 */
export async function putCredentials(
  basePath: string,
  credentials: ForecasterCredentials,
): Promise<void> {
  const res = await fetch(`${getForecasterBasePath(basePath)}/credentials`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (res.status === 403) {
    let body: { error?: string; missingPrivileges?: string[] } = {};
    try {
      body = await res.json();
    } catch (_) {
      // ignore
    }
    throw new CredentialsForbiddenError(
      body.error ?? "Insufficient vCenter privileges",
      body.missingPrivileges ?? [],
    );
  }
  await handleResponse<void>(res);
}

/** POST /forecaster/datastores — returns datastores with storage vendor and
 *  capability information. No credentials needed. */
export async function postDatastores(
  basePath: string,
): Promise<ForecasterDatastore[]> {
  const res = await fetch(`${getForecasterBasePath(basePath)}/datastores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<ForecasterDatastore[]>(res);
}

/**
 * POST /forecaster — start async benchmark for one or more datastore pairs.
 * Credentials are optional if previously provided in an earlier request.
 * Returns 202 on success.
 * Throws ForecastConflictError on 409 (benchmark already running).
 */
export async function startForecast(
  basePath: string,
  request: ForecastStartRequest,
): Promise<ForecasterStatus> {
  const res = await fetch(getForecasterBasePath(basePath), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (res.status === 409) {
    let msg =
      "A benchmark is already running. Wait for it to finish or cancel it before starting a new one.";
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch (_) {
      // use default message
    }
    throw new ForecastConflictError(msg);
  }
  return handleResponse<ForecasterStatus>(res);
}

/**
 * GET /forecaster — poll current service state and per-pair progress.
 * Top-level state is "ready" | "running".
 */
export async function getForecasterStatus(
  basePath: string,
): Promise<ForecasterStatus> {
  const res = await fetch(getForecasterBasePath(basePath));
  return handleResponse<ForecasterStatus>(res);
}

/**
 * DELETE /forecaster — cancel the running benchmark.
 * Already-completed runs are preserved. Returns 202 with ForecasterStatus.
 */
export async function cancelForecast(
  basePath: string,
): Promise<ForecasterStatus> {
  const res = await fetch(getForecasterBasePath(basePath), {
    method: "DELETE",
  });
  return handleResponse<ForecasterStatus>(res);
}

/**
 * DELETE /forecaster/pairs/{name} — cancel a single pair.
 * The forecaster continues running if other pairs are still active.
 * Returns 202 with { pairName, state: "canceled" }.
 */
export async function cancelForecastPair(
  basePath: string,
  pairName: string,
): Promise<{ pairName: string; state: "canceled" }> {
  const res = await fetch(
    `${getForecasterBasePath(basePath)}/pairs/${encodeURIComponent(pairName)}`,
    { method: "DELETE" },
  );
  return handleResponse<{ pairName: string; state: "canceled" }>(res);
}

/** GET /forecaster/runs — list benchmark runs, optionally filtered by pair name. */
export async function getRuns(
  basePath: string,
  pairName?: string,
): Promise<ForecastRun[]> {
  const url = new URL(
    `${getForecasterBasePath(basePath)}/runs`,
    window.location.origin,
  );
  if (pairName) url.searchParams.set("pairName", pairName);
  const res = await fetch(url.toString());
  return handleResponse<ForecastRun[]>(res);
}

/**
 * DELETE /forecaster/runs/{id} — delete a specific benchmark run.
 * Returns 204 No Content on success.
 */
export async function deleteForecastRun(
  basePath: string,
  id: number,
): Promise<void> {
  const res = await fetch(`${getForecasterBasePath(basePath)}/runs/${id}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

const CANCEL_SETTLE_POLL_INTERVAL_MS = 500;
const CANCEL_SETTLE_TIMEOUT_MS = 30_000;

async function waitForForecasterReady(basePath: string): Promise<void> {
  const deadline = Date.now() + CANCEL_SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await getForecasterStatus(basePath);
    if (status.state === "ready") {
      return;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, CANCEL_SETTLE_POLL_INTERVAL_MS),
    );
  }
  throw new Error("Timed out waiting for forecaster to become ready.");
}

/**
 * Cancel any in-progress benchmark and delete all persisted runs.
 */
export async function deleteAllForecastRuns(basePath: string): Promise<void> {
  let status: ForecasterStatus;
  try {
    status = await getForecasterStatus(basePath);
  } catch {
    status = { state: "ready" };
  }

  if (status.state === "running") {
    try {
      await cancelForecast(basePath);
    } catch {
      // Benchmark may already be finished or the pipeline may already be stopped.
    }
    try {
      await waitForForecasterReady(basePath);
    } catch {
      // Proceed with run deletion even if cancel did not settle in time.
    }
  }

  const runs = await getRuns(basePath);
  if (runs.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    runs.map((run) => deleteForecastRun(basePath, run.id)),
  );
  const failures = results.flatMap((result, index) => {
    if (result.status !== "rejected") {
      return [];
    }
    const run = runs[index];
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return [`run ${run.id} (${run.pairName}): ${reason}`];
  });
  if (failures.length > 0) {
    throw new Error(
      `Failed to remove ${failures.length} of ${runs.length} estimation run(s): ${failures.join("; ")}`,
    );
  }
}

/** GET /forecaster/stats — throughput statistics for a datastore pair. */
export async function getStats(
  basePath: string,
  pairName: string,
): Promise<ForecastStats> {
  const url = new URL(
    `${getForecasterBasePath(basePath)}/stats`,
    window.location.origin,
  );
  url.searchParams.set("pairName", pairName);
  const res = await fetch(url.toString());
  return handleResponse<ForecastStats>(res);
}

/**
 * POST /forecaster/capabilities — compute feasible offload methods for pairs.
 * No credentials required; derived from forklift-collected inventory.
 */
export async function getPairCapabilities(
  basePath: string,
  request: PairCapabilityRequest,
): Promise<PairCapability[]> {
  const res = await fetch(`${getForecasterBasePath(basePath)}/capabilities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<PairCapability[]>(res);
}
