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
