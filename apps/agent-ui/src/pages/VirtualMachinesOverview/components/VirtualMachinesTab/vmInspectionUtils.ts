import { ResponseError } from "@openshift-migration-advisor/agent-sdk";

const CANCEL_RETRY_DELAY_MS = 2000;
const CANCEL_MAX_ATTEMPTS = 5;

export interface InspectionStatusLike {
  state: string;
  error?: string;
}

/**
 * True when the UI should show "Canceled" for a VM's deep inspection status.
 * Relies on backend `canceled` state when available, and on client-tracked
 * user-initiated cancels when the backend reports `error` instead.
 */
export function isCanceledInspectionStatus(
  vmId: string,
  status: InspectionStatusLike,
  userCanceledVmIds?: ReadonlySet<string>,
): boolean {
  if (status.state === "canceled") {
    return true;
  }
  return status.state === "error" && (userCanceledVmIds?.has(vmId) ?? false);
}

function isRetryableCancelError(err: unknown): boolean {
  if (!(err instanceof ResponseError)) return false;
  const status = err.response?.status;
  return status === 400 || status === 409 || status === 503;
}

/**
 * DELETE /vms/{id}/inspection — bypasses the SDK because the endpoint may
 * return 200/204 with an empty body, which breaks JSONApiResponse parsing.
 */
async function removeVmFromInspection(
  basePath: string,
  vmId: string,
): Promise<void> {
  const res = await fetch(
    `${basePath}/vms/${encodeURIComponent(vmId)}/inspection`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new ResponseError(res, `HTTP ${res.status}`);
  }

  // Body is optional on success.
  await res.text();
}

export async function cancelVmInspectionWithRetry(
  basePath: string,
  vmId: string,
): Promise<void> {
  for (let attempt = 0; attempt < CANCEL_MAX_ATTEMPTS; attempt++) {
    try {
      await removeVmFromInspection(basePath, vmId);
      return;
    } catch (err) {
      const isLastAttempt = attempt === CANCEL_MAX_ATTEMPTS - 1;
      if (!isRetryableCancelError(err) || isLastAttempt) {
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, CANCEL_RETRY_DELAY_MS),
      );
    }
  }
}

export async function extractCancelInspectionErrorMessage(
  err: unknown,
): Promise<string> {
  if (err instanceof ResponseError) {
    try {
      const text = await err.response.clone().text();
      if (text) {
        const body = JSON.parse(text);
        if (typeof body?.message === "string" && body.message) {
          return body.message;
        }
        if (typeof body?.error === "string" && body.error) {
          return body.error;
        }
      }
    } catch {
      // fall through to status-based message
    }

    const status = err.response?.status;
    if (status === 400) {
      return "This VM cannot be canceled right now. The inspector may still be finishing the current step.";
    }
    if (status === 404) {
      return "This VM is no longer in the inspection queue.";
    }
  }

  return err instanceof Error
    ? err.message
    : "Failed to cancel deep inspection";
}
