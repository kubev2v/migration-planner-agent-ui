import { Time } from "./Time";

export const REQUEST_TIMEOUT_MS = 30 * Time.Second;

export function newAbortSignal(
  abortMessage = "Connection timeout",
  delay = REQUEST_TIMEOUT_MS,
): AbortSignal {
  const abortController = new AbortController();
  const signal = abortController.signal;

  if (delay) {
    window.setTimeout(() => {
      abortController.abort(abortMessage);
    }, delay);
  }

  return signal;
}

export type CancellableRequest = {
  signal: AbortSignal;
  cancel: () => void;
  cleanup: () => void;
  wasCanceledByUser: () => boolean;
};

export function newCancellableRequest(
  timeoutMessage = "Connection timeout",
  delay = REQUEST_TIMEOUT_MS,
): CancellableRequest {
  const abortController = new AbortController();
  let canceledByUser = false;

  const timeoutId = window.setTimeout(() => {
    if (!abortController.signal.aborted) {
      abortController.abort(timeoutMessage);
    }
  }, delay);

  return {
    signal: abortController.signal,
    cancel: () => {
      canceledByUser = true;
      window.clearTimeout(timeoutId);
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    },
    cleanup: () => {
      window.clearTimeout(timeoutId);
    },
    wasCanceledByUser: () => canceledByUser,
  };
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : err instanceof Error && err.name === "AbortError";
}
