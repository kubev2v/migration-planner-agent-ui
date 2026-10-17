import { ResponseError } from "@openshift-migration-advisor/agent-sdk";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AgentApiClient } from "../api/agentApi";
import { parseApiError } from "../common/parseApiError";

/**
 * A baseQuery arg is a callback that performs the request using the composed
 * SDK client. This lets RTK Query reuse the existing SDK (auth, base path,
 * `cache: "no-store"`) and the raw-fetch inventory workaround, instead of
 * `fetchBaseQuery` over URLs.
 */
export type SdkQueryArg<T> = (sdk: AgentApiClient) => Promise<T>;

/** Error shape surfaced to RTK Query consumers. */
export interface SdkQueryError {
  status?: number;
  message: string;
}

/**
 * Extract a human-readable message from a rejected `.unwrap()` error. The
 * baseQuery maps SDK errors to `{ status, message }`, so callers cannot rely on
 * `err instanceof Error`.
 */
export function getSdkErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** The SDK client injected into the store via thunk `extraArgument`. */
export interface SdkExtra {
  agentApi: AgentApiClient;
}

/**
 * Custom baseQuery that executes SDK-method callbacks. The client is read from
 * the thunk `extraArgument` (see `createStore`), so there is a single client
 * instance shared with the IoC container and it is trivial to inject a fake in
 * tests.
 */
export const sdkBaseQuery =
  (): BaseQueryFn<SdkQueryArg<unknown>, unknown, SdkQueryError> =>
  async (fn, api) => {
    const { agentApi } = api.extra as SdkExtra;
    try {
      const data = await fn(agentApi);
      return { data };
    } catch (err) {
      if (err instanceof ResponseError) {
        // Reuse `parseApiError` so RTK Query consumers get the same detailed
        // server-body message the direct-SDK code paths surface.
        return {
          error: {
            status: err.response?.status,
            message: await parseApiError(err),
          },
        };
      }
      return {
        error: {
          message: err instanceof Error ? err.message : "Request failed",
        },
      };
    }
  };
